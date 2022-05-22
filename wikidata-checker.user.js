/* global GM_xmlhttpRequest */
// ==UserScript==
// @name         Letterboxd Extras
// @namespace    https://github.com/duncanlang
// @version      1.0.0
// @description  Adds a few additional features to Letterboxd.
// @author       Duncan Lang
// @match        https://letterboxd.com/*
// @connect      https://www.imdb.com
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==


// setTimeout(function(){ debugger; }, 5000);  - used to freeze the inspector

(function() { // eslint-disable-line wrap-iife

	'use strict'; // eslint-disable-line strict
	
	/* eslint-disable */
	GM_addStyle(`
		.twipsy-extra-in{
			opacity: 1 !important;
			-webkit-transition: opacity 0.25s ease-out;
			transition: opacity 0.25s ease-out;
		}
		.twipsy-extra{
			opacity: 0 !important;
		}
		.twipsy-extra-out{
			opacity: 0 !important;
			-webkit-transition: opacity 0.10s linear;
			transition: opacity 0.10s linear;
		}
		.report-item{
			display: inline-block;
			height: 60px;
			width: 85px;
			margin-left: 5px;
			margin-right: 5px;
			justify-content: center;
			text-align: center;
			font-size: 15px;
		}
		.report-state-item{
			border: solid 1px white;
			height: 20px;
			width: 20px;
			border-radius: 100px;
			justify-content: center;
			text-align: center;
			font: 15px;
			display: inline-block;
		}
		.report-state-good{
			color: #1dd1a1;
			border-color: #1dd1a1;
		}
		.report-state-warn{
			color: #feca57;
			border-color: #feca57;
		}
		.report-state-bad{
			color: #ff6b6b;
			border-color: #ff6b6b;
		}
		.report-item a{
			display: block;
			color: #9ab;
		}
		.report-item a:hover{
			color: #40bcf4;
			cursor: pointer;
		}
	`);
	/* eslint-enable */

	const letterboxd = {

		overview: {

			lastLocation: window.location.pathname,

			running: false,

			letterboxdYear: null,
			omdbData: {state: 0, data: null},

			// IMDb
			imdbID: "",
			imdbData: {state: 0, url: "", data: null, raw: null, rating: "", num_ratings: "", highest: 0, votes: new Array(10), percents: new Array(10), isMiniSeries: false, isTVEpisode: false},

			// WikiData
			wiki: null,
			wikiData: {state: 0, tomatoURL: null, metaURL: "", budget: {value: null, currency: null}, boxOfficeUS: {value: null, currency: null}, boxOfficeWW: {value: null, currency: null}, mpaa: null, date: null, date_origin: null, rating: null, US_Title: null, Alt_Title: null, TV_Start: null, TV_End: null},

			// OMDb
			omdbData: {state: 0, data: null, metascore: null, tomatoURL: null},

			stopRunning() {
				this.running = false;
			},

			async init() {
				if (this.running) return;

				this.running = true;

				if (document.querySelector(".number")){
					this.letterboxdYear = document.querySelectorAll(".number a")[0].innerText;
				}

				// First Get the IMDb link
				if (this.imdbID == "" && document.querySelector('.micro-button') != null){
					// Gets the IMDb link and ID, and also TMDB id
					this.getIMDbLink();
				}

				var canAdd = (document.querySelector('.sidebar'))

				if ((this.imdbID != "" || this.tmdbID != '') && this.wikiData.state < 1 && canAdd){
					// Call WikiData
					this.wikiData.state = 1;
					if (this.imdbID != '') // IMDb should be most reliable
						var queryString = 'https://query.wikidata.org/bigdata/namespace/wdq/sparql?format=json&query=' + letterboxd.helpers.getWikiDataQuery(this.imdbID, 'IMDB');
					else if (this.tmdbID != '') // Every page should have a TMDB ID
						var queryString = 'https://query.wikidata.org/bigdata/namespace/wdq/sparql?format=json&query=' + letterboxd.helpers.getWikiDataQuery(this.tmdbID, 'TMDB');

					this.wiki = await letterboxd.helpers.getWikiData(queryString)

					if (this.wiki != null && this.wiki.results != null && this.wiki.results.bindings != null && this.wiki.results.bindings.length > 0){
						// Loop and find the best result
						if (this.wiki.results.bindings.length > 1){
							var results = [];
							for (var i = 0; i < this.wiki.results.bindings.length; i++){
								var result = this.wiki.results.bindings[i];
								var entry = {id: i, score: 0};

								if (result.TV_Start != null && !result.TV_Start.value.includes("-01-01T")){
									entry.score++;
								}
								if (result.TV_End != null && !result.TV_End.value.includes("-01-01T")){
									entry.score++;
								}
								if (result.Publication_Date != null && !result.Publication_Date.value.includes("-01-01T")){
									entry.score++;
								}
								if (result.Publication_Date_Origin != null && !result.Publication_Date_Origin.value.includes("-01-01T")){
									entry.score++;
								}
								if (result.Publication_Date_Backup != null && !result.Publication_Date_Backup.value.includes("-01-01T")){
									entry.score++;
								}
								results.push(entry);
							}
							results.sort((a, b) => {
								return b.score - a.score;
							});
							this.wiki = this.wiki.results.bindings[results[0].id];
						}else{
							this.wiki = this.wiki.results.bindings[0];
						}

						// Now get the OMDb before
						var omdbString = "https://www.omdbapi.com/?apikey=afd82b43&i=" + this.imdbID + "&plot=short&r=json&tomatoes=true";
						console.log("WikiData-Checker | Calling: " + omdbString);
						try{
							this.omdbData.data = await letterboxd.helpers.getOMDbData(omdbString);
						}catch{
							this.omdbData.data = null
						}
						if (this.omdbData.data != null){
							if (this.omdbData.data.Metascore != null && this.omdbData.data.Metascore != "N/A")
								this.omdbData.metascore = this.omdbData.data.Metascore;
								
							if (this.omdbData.data.Rated != null && this.omdbData.data.Rated != "N/A")
								this.omdbData.rated = this.omdbData.data.Rated;
	
							if (this.omdbData.data.tomatoURL != null && this.omdbData.data.tomatoURL != "N/A")
								this.omdbData.tomatoURL = this.omdbData.data.tomatoURL;
						}


						this.wikiData.state = 2;
					}else{
						this.wiki = null;
					}

					this.addWikiDataReport();
				}

				// Stop
				return this.stopRunning();
			},

			getIMDbLink(){
				// Get the two links (imdb and tmdb)
				const links = document.querySelectorAll('.micro-button.track-event');

				var imdbLink = "";
				var tmdbLink = "";

				// Loop and find IMDB
				for(var i = 0; i < links.length; i++){
					if (links[i].innerHTML === "IMDb"){
						// Grab the imdb page
						imdbLink = links[i].href;
						if (!imdbLink.includes("https") && imdbLink.includes('http'))
							imdbLink = imdbLink.replace("http","https");
						if (imdbLink.includes("maindetails"))
							imdbLink = imdbLink.replace("maindetails","ratings");

						this.imdbData.url = imdbLink;

					}else if (links[i].innerHTML === "TMDb"){
						// Grab the tmdb link
						tmdbLink = links[i].href;
					}
				}

				// Separate out the ID
				this.imdbID = imdbLink.match(/(imdb.com\/title\/)(tt[0-9]+)(\/)/)[2];

				// Separate the TMDB ID
				if (tmdbLink != ""){
					this.tmdbID = tmdbLink.match(/(themoviedb.org\/(?:tv|movie)\/)([0-9]+)($|\/)/)[2];
				}
			},

			addWikiDataReport(){	
				if (document.querySelector('.wikidata-report')) return;
				
				// Create Section
				//*********************************************
				const section = letterboxd.helpers.createElement('section', {
					class: 'film-recent-reviews wikidata-report'
				},{
					position: 'relative'
				});				

				// Add the Header
				const heading = letterboxd.helpers.createElement('h2', {
					class: 'section-heading',
					style: 'height: 16px;'
				});
				section.append(heading);

				const headerLink = letterboxd.helpers.createElement('a', {
				});
				if (this.wiki != null)
					headerLink.setAttribute('href', this.wiki.item.value);
				heading.append(headerLink);

				const headerText = letterboxd.helpers.createElement('span', {
				});
				headerText.innerText = "WikiData Report";
				headerLink.append(headerText);

				// Add the Wikipedia Link
				if (this.wiki.Wikipedia != null){
					const showDetails = letterboxd.helpers.createElement('a', {
						class: 'all-link',
						href: this.wiki.Wikipedia.value
					});
					showDetails.innerText = "Wikipedia";
					section.append(showDetails);
				}

				// Create the Report
				//*********************************************
				// ul
				const ul = letterboxd.helpers.createElement('ul', {
					class: 'avatar-list'
				});
				section.append(ul);


				var title = document.querySelector(".headline-1.js-widont.prettify").innerText;
				title = title.replace(/\s+/g, '+');

				if (this.wiki != null){
					// Tomato
					//***********************************************
					var tomatoSearchURL = "https://www.rottentomatoes.com/search?search=" + title;
					if (this.wiki.Rotten_Tomatoes_ID != null){
						ul.append(letterboxd.helpers.createReportBox("Tomato","No Issues","good",tomatoSearchURL));
					}else if(this.omdbData.tomatoURL != null){
						ul.append(letterboxd.helpers.createReportBox("Tomato","Missing Rotten Tomatoes ID, but found in OMDb","bad",tomatoSearchURL));
					}else{
						ul.append(letterboxd.helpers.createReportBox("Tomato","Missing Rotten Tomatoes ID","bad",tomatoSearchURL));
					}

					// Meta
					//***********************************************
					var metaSearchURL = "https://www.metacritic.com/search/movie/" + title + "/results";
					if (this.wiki.Metacritic_ID != null){
						ul.append(letterboxd.helpers.createReportBox("Meta","No Issues","good",metaSearchURL));
					}else if(this.omdbData.metascore != null){
						ul.append(letterboxd.helpers.createReportBox("Meta","Missing Metacritic ID, but found in OMDb","bad",metaSearchURL));
					}else{
						ul.append(letterboxd.helpers.createReportBox("Meta","Possibly missing Metacritic ID","warn",metaSearchURL));
					}

					// MPAA
					//***********************************************
					var mpaaSearchURL = "https://www.filmratings.com/Search?filmTitle=" + title
					if (this.wiki.MPAA_film_ratingLabel != null){
						ul.append(letterboxd.helpers.createReportBox("MPAA","No Issues","good",mpaaSearchURL));
					}else{
						var ratings = ["G","PG","PG-13","R","NC-17"]
						var bad = false
						if (this.omdbData.rated != null && ratings.includes(this.omdbData.rated))
							bad = true;

						if (bad){
							ul.append(letterboxd.helpers.createReportBox("MPAA","Missing MPAA rating, but found in OMDb","bad",mpaaSearchURL));
						}else{
							ul.append(letterboxd.helpers.createReportBox("MPAA","Missing MPAA rating","warn",mpaaSearchURL));
						}
					}

					// DATES
					//***********************************************
					var releaseInfoUrl = 'https://www.imdb.com/title/' + this.imdbID + '/releaseinfo';
					// TV Dates
					if (this.wiki.TV_Start != null){
						// Start Date
						if (this.wiki.TV_Start != null){
							ul.append(letterboxd.helpers.createReportBox("Start Date","No Issues","good",releaseInfoUrl));
						}else{
							ul.append(letterboxd.helpers.createReportBox("Start Date","Missing TV start date","bad",releaseInfoUrl));
						}

						// End Date
						if (this.wiki.TV_End != null){
							ul.append(letterboxd.helpers.createReportBox("End Date","No Issues","good",releaseInfoUrl));
						}else{
							ul.append(letterboxd.helpers.createReportBox("End Date","Missing TV end date","bad",releaseInfoUrl));
						}

					}else{
						// Country of Origin Date
						var hasOriginDate = false;
						if (this.wiki.Publication_Date_Origin != null){
							hasOriginDate = true;
							if (this.wiki.Publication_Date_Origin.value.includes("-01-01T")){
								ul.append(letterboxd.helpers.createReportBox("Origin Date","Country of Origin release date missing full date (year only)","warn",releaseInfoUrl));
							}else{
								ul.append(letterboxd.helpers.createReportBox("Origin Date","No Issues","good",releaseInfoUrl));
							}
						}else{
							ul.append(letterboxd.helpers.createReportBox("Origin Date","Missing Country of Origin release date","bad",releaseInfoUrl));
						}

						// USA Date
						var hasUSDate = false;
						if (this.wiki.Publication_Date != null){
							hasUSDate = true;
							if (this.wiki.Publication_Date.value.includes("-01-01T")){
								ul.append(letterboxd.helpers.createReportBox("USA Date","US release date missing full date (year only)","warn",releaseInfoUrl));
							}else{
								ul.append(letterboxd.helpers.createReportBox("USA Date","No Issues","good",releaseInfoUrl));
							}
						}else{
							if (hasOriginDate){
								ul.append(letterboxd.helpers.createReportBox("USA Date","Missing US release date","warn",releaseInfoUrl));
							}else{
								ul.append(letterboxd.helpers.createReportBox("USA Date","Missing US release date","bad",releaseInfoUrl));
							}
						}

						// Backup Date
						if (this.wiki.Publication_Date_Backup != null){
							if (this.wiki.Publication_Date_Backup.value.includes("-01-01T")){
								var state  = "warn";
								if (hasUSDate || hasOriginDate){
									state  = "good";
								}
								ul.append(letterboxd.helpers.createReportBox("Backup Date","Backup release date missing full date (year only)",state,releaseInfoUrl));
							}else{
								ul.append(letterboxd.helpers.createReportBox("Backup Date","No Issues","good",releaseInfoUrl));
							}
						}else{
							if (hasUSDate || hasOriginDate){
								ul.append(letterboxd.helpers.createReportBox("Backup Date","Missing Backup release date","good",releaseInfoUrl));
							}else{
								ul.append(letterboxd.helpers.createReportBox("Backup Date","Missing Backup release date","bad",releaseInfoUrl));
							}
						}

						// Budget
						//***********************************************
						var mojoURL = "https://www.boxofficemojo.com/title/" + this.imdbID;
						if (this.wiki.Budget != null){
							ul.append(letterboxd.helpers.createReportBox("Budget","No Issues","good",mojoURL));
						}else{
							ul.append(letterboxd.helpers.createReportBox("Budget","Missing budget","bad",mojoURL));
						}
	
						// Box Office US
						//***********************************************
						if (this.wiki.Box_OfficeUS != null){
							ul.append(letterboxd.helpers.createReportBox("Box Office US","No Issues","good",mojoURL));
						}else{
							ul.append(letterboxd.helpers.createReportBox("Box Office US","Missing US box office","bad",mojoURL));
						}
	
						// Box Office WW
						//***********************************************
						if (this.wiki.Box_OfficeWW != null){
							ul.append(letterboxd.helpers.createReportBox("Box Office WW","No Issues","good",mojoURL));
						}else{
							ul.append(letterboxd.helpers.createReportBox("Box Office WW","Missing worldwide box office","bad",mojoURL));
						}
					}

					// Letterboxd ID
						//***********************************************
					if (this.wiki.Letterboxd_ID != null){
						ul.append(letterboxd.helpers.createReportBox("Letterboxd ID","No Issues","good",mojoURL));
					}else{
						ul.append(letterboxd.helpers.createReportBox("Letterboxd ID","Missing Letterboxd ID","bad",mojoURL));
					}
				}else{
					ul.append(letterboxd.helpers.createReportBox("WikiData","Connot find WikiData page","bad"));
				}


				// Append to the page
				//*********************************************
				document.querySelector('.sidebar').after(section);

				// Add the hover events
				//*****************************************************************
				$(".report-state-item").on("mouseover", ShowTwipsy);
				$(".report-state-item").on("mouseout", HideTwipsy);
			}
		},

		helpers: {
			request(options) {
				return new Promise((resolve, reject) => {
					options.onload = res => resolve(res);
					options.onerror = err => reject(err);
					options.ontimeout = err => reject(err);
					GM_xmlhttpRequest(options); // eslint-disable-line new-cap
				});
			},

			async getWikiData(link) {	
				console.log("Wikidata-Checker | Calling: " + link);

				var ajaxOptions = {
					url: link,
					type : 'GET'
				}

				var output =  $.when($.ajax(ajaxOptions))
				.then(function (results) {
					return results;
				});
				
				return output;
			},

			async getOMDbData(link) {
				var ajaxOptions = {
					url: link,
					type : 'GET',
					timeout: 1000
				}

				return $.when($.ajax(ajaxOptions))
				.then(function (results) {
					return results;
				});
			},

			createElement(tag, attrs, styles) {
				const element = document.createElement(tag);
				for (const aKey in attrs) {
					if (!Object.prototype.hasOwnProperty.call(attrs, aKey)) continue;
					element.setAttribute(aKey, attrs[aKey]);
				}
				for (const sKey in styles) {
					if (!Object.prototype.hasOwnProperty.call(styles, sKey)) continue;
					element.style[sKey] = styles[sKey];
				}
				return element;
			},

			createReportBox(title, value, state, url){
				const li = letterboxd.helpers.createElement('li', {
					class: 'listitem report-item'
				});

				// Title
				var titletext = null;
				if (url != null){
					titletext = letterboxd.helpers.createElement('a', {
						href: url
					});
				}else{
					titletext = letterboxd.helpers.createElement('h4', {
					});
				}
				titletext.innerText = title;
				li.append(titletext);

				// State
				if (state == "good")
					var stateText = "✓";
				else if (state == "warn")
					var stateText = "!";
				else
					var stateText = "X";
				const stateIcon = letterboxd.helpers.createElement('span', {
					class: 'report-state-item report-state-' + state,
					['data-original-title']: value
				});
				stateIcon.innerText = stateText;
				li.append(stateIcon);


				return li;
			},

			getTextBetween(text, start, end){
				var tempArray = text.split(start);
				tempArray = tempArray[1].split(end);

				return (tempArray[0]);
			},

			parseHTML(html){
				var parser = new DOMParser();
				return parser.parseFromString(html, "text/html");
			},

			getOriginalURL(html){
				var output = "";
				var split = html.split('<meta property="og:url" content="');
				output = split[1].split('">')[0];
				return output;
			},

			fixURL(url){
				// replace http with https
				if (url.includes("http://"))
					url = url.replace("http://","https://");

				// Make sure it has https
				if (!url.startsWith("https://"))
					url = "https://" + url;
					
				// Make sure it was www
				if (!url.includes("www."))
					url = url.replace("https://","https://www.");

				return url;
			},

			getValidASCIIString(input){
				var output = '';

				for(var i = 0; i < input.length; i++){
					if (input.codePointAt(i) >= 256){
						break;
					}else{
						output += input[i];
					}
				}

				return output;
			},

			encodeASCII(text){
				return btoa(unescape(encodeURIComponent(text)));
			},

			cleanupInnerText(value){
				var out = value.replaceAll("\n","");
				out = out.trim();
				return out;
			},

			cleanNumber(value){
				value = value.replaceAll(',','');
				value = value.replaceAll('.','');
				value = value.replaceAll(' ','');

				return value;
			},
			
			getWikiDataQuery(id, idType){
				switch(idType.toUpperCase()){
					case "IMDB":
						idType = "P345";
						break;
					case "TMDB":
						idType = "P4947";
						break;
					case "LETTERBOXD":
						idType = "P6127";
						break;
				}
				var sparqlQuery = "SELECT DISTINCT ?item ?itemLabel ?Rotten_Tomatoes_ID ?Metacritic_ID ?Letterboxd_ID ?Wikipedia ?MPAA_film_ratingLabel ?Budget ?Budget_UnitLabel ?Box_OfficeUS ?Box_OfficeUS_UnitLabel ?Box_OfficeWW ?Box_OfficeWW_UnitLabel ?Publication_Date ?Publication_Date_Backup ?Publication_Date_Origin ?US_Title ?TV_Start ?TV_End WHERE {\n" +
				"  SERVICE wikibase:label { bd:serviceParam wikibase:language \"[AUTO_LANGUAGE],en\". }\n" +
				"  {\n" +
				"    SELECT DISTINCT ?item WHERE {\n" +
				"      ?item p:" + idType + " ?statement0.\n" +
				"      ?statement0 ps:" + idType + " \"" + id + "\".\n" +
				"    }\n" +
				"    LIMIT 10\n" +
				"  }\n" +
				"  OPTIONAL { ?item wdt:P1258 ?Rotten_Tomatoes_ID. }\n" +
				"  OPTIONAL { ?item wdt:P1712 ?Metacritic_ID. }\n" +
				"  OPTIONAL { ?item wdt:P6127 ?Letterboxd_ID. }\n" +
				"  OPTIONAL { ?item wdt:P1657 ?MPAA_film_rating. } \n" +
				"  OPTIONAL {\n" +
				"    ?Wikipedia schema:about ?item .\n" +
				"    ?Wikipedia schema:inLanguage \"en\" .\n" +
				"    ?Wikipedia schema:isPartOf <https://en.wikipedia.org/> .\n" +
				"  }\n" +
				"  OPTIONAL {\n" +
				"    ?item p:P2130 ?Budget_Entry.\n" +
				"    ?Budget_Entry ps:P2130 ?Budget.\n" +
				"    OPTIONAL {\n" +
				"      ?Budget_Entry psv:P2130 ?valuenode.\n" +
				"      ?valuenode wikibase:quantityUnit ?Budget_Unit.\n" +
				"      ?Budget_Unit p:P498 [ps:P498 ?Budget_UnitLabel].\n" +
				"    }\n" +
				"    MINUS { ?Budget_Entry wikibase:rank wikibase:DeprecatedRank. }\n" +
				"  }\n" +
				"  OPTIONAL {\n" +
				"    ?item p:P2142 ?Box_Office_Entry.\n" +
				"    ?Box_Office_Entry ps:P2142 ?Box_OfficeUS;\n" +
				"      pq:P3005 wd:Q30.\n" +
				"    OPTIONAL {\n" +
				"      ?Box_Office_Entry psv:P2142 ?valuenode2.\n" +
				"      ?valuenode2 wikibase:quantityUnit ?Box_Office_Unit.\n" +
				"      ?Box_Office_Unit p:P498 [ps:P498 ?Box_OfficeUS_UnitLabel].\n" +
				"    }\n" +
				"    MINUS { ?Box_Office_Entry wikibase:rank wikibase:DeprecatedRank. }\n" +
				"  }\n" +
				"  OPTIONAL {\n" +
				"    ?item p:P2142 ?Box_Office_Entry.\n" +
				"    ?Box_Office_Entry ps:P2142 ?Box_OfficeUS;\n" +
				"      pq:P3005 wd:Q2017699.\n" +
				"    OPTIONAL {\n" +
				"      ?Box_Office_Entry psv:P2142 ?valuenode2.\n" +
				"      ?valuenode2 wikibase:quantityUnit ?Box_Office_Unit.\n" +
				"      ?Box_Office_Unit p:P498 [ps:P498 ?Box_OfficeUS_UnitLabel].\n" +
				"    }\n" +
				"    MINUS { ?Box_Office_Entry wikibase:rank wikibase:DeprecatedRank. }\n" +
				"  }\n" +
				"  OPTIONAL {\n" +
				"    ?item p:P2142 ?Box_Office_EntryWW.\n" +
				"    ?Box_Office_EntryWW ps:P2142 ?Box_OfficeWW;\n" +
				"      pq:P3005 wd:Q13780930.\n" +
				"    OPTIONAL {\n" +
				"      ?Box_Office_EntryWW psv:P2142 ?valuenode3.\n" +
				"      ?valuenode3 wikibase:quantityUnit ?Box_OfficeWW_Unit.\n" +
				"      ?Box_OfficeWW_Unit p:P498 [ps:P498 ?Box_OfficeWW_UnitLabel].\n" +
				"    }\n" +
				"    MINUS { ?Box_Office_EntryWW wikibase:rank wikibase:DeprecatedRank. }\n" +
				"  }\n" +
				"  OPTIONAL {\n" +
				"    ?item p:P577 ?Publication_Date_entry.\n" +
				"    ?Publication_Date_entry ps:P577 ?Publication_Date;\n" +
				"      pq:P291 wd:Q30.\n" +
				"    MINUS { ?Publication_Date_entry wikibase:rank wikibase:DeprecatedRank. }\n" +
				"  }\n" +
				"  OPTIONAL {\n" +
				"    ?item p:P577 ?Publication_Date_Backup_entry.\n" +
				"    ?Publication_Date_Backup_entry ps:P577 ?Publication_Date_Backup.\n" +
				"    FILTER NOT EXISTS { ?Publication_Date_Backup_entry pq:P291 [] }\n" +
				"    MINUS { ?Publication_Date_Backup_entry wikibase:rank wikibase:DeprecatedRank. }\n" +
				"  }\n" +
				"  OPTIONAL {\n" +
				"    ?item wdt:P495 ?Country_Of_Origin.\n" +
				"    OPTIONAL {\n" +
				"      ?item p:P577 ?Date_Origin_entry.\n" +
				"      ?Date_Origin_entry ps:P577 ?Publication_Date_Origin;\n" +
				"        pq:P291 ?Country_Of_Origin.\n" +
				"      MINUS { ?Date_Origin_entry wikibase:rank wikibase:DeprecatedRank. }\n" +
				"    }\n" +
				"  }\n" +
				"  OPTIONAL {\n" +
				"    ?item p:P1476 ?Title_Entry.\n" +
				"    ?Title_Entry ps:P1476 ?US_Title;\n" +
				"      pq:P3005 wd:Q30.\n" +
				"  }\n" +
				"  OPTIONAL { ?item wdt:P580 ?TV_Start. }\n" +
				"  OPTIONAL { ?item wdt:P582 ?TV_End. }\n" +
				"}";
				
				return sparqlQuery;
			}
		}
	};

	const observer = new MutationObserver(() => {

		if (window.location.hostname === 'letterboxd.com') {
			if (window.location.pathname.startsWith('/film/') && !window.location.pathname.includes("ratings")) {
				letterboxd.overview.init();
			}
		}
	});

	observer.observe(document, { childList: true, subtree: true });
})();

function ShowTwipsy(event){
	//if (document.querySelector('.twipsy.fade.above.in')){
	if (document.querySelector('.twipsy-extra-out')){
		//var temp = document.querySelector('.twipsy.fade.above.in');
		var temp = document.querySelector('.twipsy-extra-out');
		temp.parentNode.removeChild(temp);
	}

	const twipsy = document.createElement('div');
	twipsy.className = 'twipsy above twipsy-extra';

	//twipsy.style = 'display: block; top: 824.4px; left: 1268.5px';

	const arrow = document.createElement('div');
	arrow.className = 'twipsy-arrow';
	arrow.style = 'left: 50%';
	twipsy.append(arrow);

	const inner = document.createElement('div');
	inner.className = 'twipsy-inner';
	inner.innerText = this.getAttribute("data-original-title");
	twipsy.append(inner);

	$("body").prepend(twipsy);

	var rect = getOffset(this);
	var top = rect.top - twipsy.clientHeight;
	var left = rect.left - (twipsy.clientWidth / 2) + (this.offsetWidth / 2); //(this.clientWidth / 2 );

	twipsy.style = 'display:block; top: ' + top.toString() + 'px; left: ' + left.toString() + 'px;';

    twipsy.className = twipsy.className.replace('twipsy-extra','twipsy-extra-in');
}

function HideTwipsy(event){
	if (document.querySelector('.twipsy-extra-in')){
		var twipsy = document.querySelector('.twipsy-extra-in');
		//twipsy.parentNode.removeChild(twipsy);
        twipsy.className = twipsy.className.replace("in","out");
        setTimeout(() => twipsy.style.visibility = "hidden", 100);
	}
}

function getOffset( el ) {
    var _x = 0;
    var _y = 0;
    while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
        _x += el.offsetLeft - el.scrollLeft;
        _y += el.offsetTop - el.scrollTop;
        el = el.offsetParent;
    }
    return { top: _y, left: _x };
}