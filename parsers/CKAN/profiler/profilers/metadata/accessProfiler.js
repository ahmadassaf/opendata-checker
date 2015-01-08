var profile = require('../../profile');

var extend  = require('extend');


function accessProfiler(parent) {

	extend(this, parent);

	var _               = this.util._;
	var accessProfiler  = this;

	var profileTemplate = new profile(this);

	this.start      = function start(dataset, profilerCallback) {

		var root            = dataset.result ? dataset.result : dataset;
		var dataset_keys    = _.keys(root);

		// Check if the groups object is defined and run the profiling process on its sub-components
		if (root.resources && !_.isEmpty(root.resources)) {
			this.resourceProfiling(root, function(error, profiler, dataset) {
				if (!error) profilerCallback(false, profileTemplate.getProfile(), root);
			});
		} else {
			// There are no defined resources for this dataset
			profileTemplate.addEntry("missing", "resources", "resources information (API endpoints, downloadable dumpds, etc.) is missing");
		  profilerCallback(false, profileTemplate.getProfile(), dataset);
		}
	}

	this.licenseProfiling  = function licenseProfiling(root, callback) {

		var metadtaKeys    = ["license_title", "license_url", "license_id"];
		var licenseReport  = new profile(accessProfiler);

		// Loop through the meta keys and check if they are undefined or missing
		_.each(metadtaKeys, function(key, index) {
			if (!_.has(resource, key) || !resource[key] || _.isEmpty(resource[key]))
				licenseReport.addEntry("report", key + " information is missing for this dataset");
		});

	}

	this.resourceProfiling = function resourceProfiling(root, callback) {

		var metadtaKeys = ["resource_group_id", "cache_last_updated", "revision_timestamp", "webstore_last_updated", "id", "size", "state", "hash", "description", "format", "mimetype_inner", "url-type", "mimetype", "cache_url", "name", "created", "url", "webstore_url", "last_modified", "position", "revision_id", "resource_type" ];

		// Add the section to profile group information in the profile
		profileTemplate.addObject("resource", {});

		accessProfiler.async.each(root.resources,function(resource, asyncCallback){

			// define the groupID that will be used to identify the report generation
			var resourceID               = resource["name"] || resource["description"] || resource["id"];
			var resourceReport           = new profile(accessProfiler);

			// Loop through the meta keys and check if they are undefined or missing
			_.each(metadtaKeys, function(key, index) {
				if (_.has(resource, key)) {
					if (!resource[key] || _.isEmpty(resource[key]))
						resourceReport.addEntry("undefined", key, key  + " field exists but there is no value defined");
				} else resourceReport.addEntry("missing", key, key + " field is missing");
			});

			// Check if there is a url defined and start the connectivity checks and corrections
			if (resource.url) {
				accessProfiler.util.checkAddress(resource.url, function(error, body, response) {
					if (error) {
						resourceReport.addEntry("unreachableURLs", resource.url);
						resourceReport.addEntry("report", "The url for this resource is not reachable !");
						// Augment new field to the resource metadata file to indicate that the resource is not reachable
						resource["resource_reachable"] = false;
					} else {
						// The url is de-referenced correctly, we need to check if some values are defined correctly
						var resource_size     = response.headers["content-length"];
						var resource_mimeType = response.headers["content-type"].split(';')[0];

						// Check if the resource size is correct
						if (resource.size && resource.size !== resource_size)
							resourceReport.addEntry("report", "The size for resource is not defined correctly. Provided: " + parseInt(resource.size) + " where the actual size is: " + parseInt(resource_size));
						// check if the mimeType is correct
						if (resource.mimetype && resource.mimetype !== resource_mimeType)
							resourceReport.addEntry("report", "The mimeType for resource is not defined correctly. Provided: " + resource.mimetype + " where the actual type is: " + resource_mimeType);

						// correct the values with the actual ones
						resource.size     = resource_size;
						resource.mimetype = resource_mimeType;
						// indicate that the resource is reachable
						resource["resource_reachable"] = true;
					}
					next();
				});
			} else next();

			// do the necessary checks and iterate to the next item in the async
			function next() {
				if (!resourceReport.isEmpty()) profileTemplate.addObject(resourceID,resourceReport.getProfile(),"resource");
				asyncCallback();
			}

		},function(err){
				// Check if the resources number matches the actual number
	  		checkResourcesNumber(function(error){
	  			if (!error) callback(false, profileTemplate.getProfile(), root);
	  		});
		});

		function checkResourcesNumber(callback) {
			// Check if the number of resources is the same as the number of resources defined
			if (_.has(root, "num_resources")) {
				if (root.num_resources !== root.resources.length)
					profileTemplate.addEntry("report", "num_resources field for this dataset is not correct. Provided: " + parseInt(root.num_resources) + " where the actual number is: " + parseInt(root.resources.length));
			} else profileTemplate.addEntry("missing", "num_resources", "num_resources field is missing");
			callback(false);
		}
	}
}

module.exports = accessProfiler;