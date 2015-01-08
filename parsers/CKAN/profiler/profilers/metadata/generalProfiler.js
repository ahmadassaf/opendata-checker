var profile = require('../../profile');

var extend  = require('extend');

function generalProfiler(parent) {

	extend(this, parent);

	var _                = this.util._;
	var metadataProfiler = this;

	this.start      = function start(dataset, profilerCallback) {

		var metadtaKeys     = ["private", "id", "state", "type", "name", "isopen", "url", "notes", "title"];
		var groupsKeys      = ["display_name", "description", "title", "image_display_url", "id", "name"];
		var profileTemplate = new profile(this);

		var root            = dataset.result ? dataset.result : dataset;
		var dataset_keys    = _.keys(root);

		_.each(metadtaKeys, function(key, index) {
			if (_.has(root, key)) {
				if (!root[key] || _.isEmpty(root[key]))
					profileTemplate.addEntry("undefined", key, key + " field exists but there is no value defined");
			} else profileTemplate.addEntry("missing", key, key + " field is missing");
		});

		// Check if the groups object is defined and run the profiling process on its sub-components
		if (root.groups && !_.isEmpty(root.groups)) {

			// Add the section to profile group information in the profile
			profileTemplate.addObject("group", {});

			metadataProfiler.async.each(root.groups,function(group, asyncCallback){

				// define the groupID that will be used to identify the report generation
				var groupID               = group.display_name || group.title || group.ID;
				var groupProfile           = new profile(metadataProfiler);

				// Loop through the meta keys and check if they are undefined or missing
				_.each(groupsKeys, function(key, index) {
					if (_.has(group, key)) {
						if (!group[key] || _.isEmpty(group[key]))
							groupProfile.addEntry("undefined", key, key + " field exists but there is no value defined");
					} else groupProfile.addEntry("missing", key, key + " field is missing");
				});

				if (group.image_display_url) {
					metadataProfiler.util.checkAddress(group.image_display_url, function(error, body) {
						if (error) {
							groupProfile.addEntry("unreachableURLs", group.image_display_url);
							groupProfile.addEntry("report", "The image_display_url defined for this group is not reachable !");
						}
					// do the necessary checks and iterate to the next item in the async
					next();
					});
				} else next();

				// Check if the group report is not empty and add it to the main profile report
				function next() {
					if (!groupProfile.isEmpty())
						profileTemplate.addObject(groupID,groupProfile.getProfile(),"group");
					asyncCallback();
				}

			},function(err){
				checkReferencability();
			});
		} else {
			profileTemplate.addEntry("missing", "group", "group information is missing. Check organization information as they can be mixed sometimes");
			// Launch the function that will check for the de-referencability of URLs
		  checkReferencability();
		}

		function checkReferencability() {

			metadataProfiler.util.checkAddress(root.url, function(error, body) {
				if (error) {
					profileTemplate.addEntry("report", "The url defined for this dataset is not reachable !");
					if (root.url) {
						profileTemplate.addEntry("unreachableURLs", root.url);
					}
					profilerCallback(false, profileTemplate.getProfile());
				} else profilerCallback(false, profileTemplate.getProfile());
			});
		}

	}
}

module.exports = generalProfiler;

