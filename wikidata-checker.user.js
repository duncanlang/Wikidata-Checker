// setTimeout(function(){ debugger; }, 5000);  - used to freeze the inspector

if (window.location.hostname === 'letterboxd.com') {
	if (window.location.pathname.startsWith('/film/') && !window.location.pathname.includes("ratings")) {
		WikiDataChecker();
	}
}

function WikiDataChecker() {
	const letterboxd = {
		debug: true,

		overview: {
			running: false,
			idsCollected: false,
			reportShown: false,

			streamingStudios: [ 'Netflix', 'Apple Studios', 'Amazon Studios' ],

			// Letterboxd
			letterboxdData: { state: 0, id: '', title: '', year: '', streaming: false, silent: false },
			// IMDb
			imdbData: { state: 0, url: '', id: '', data: null, raw: null, isMiniSeries: false, isTVEpisode: false, mpaa: null, meta: null},
			// TMDB
			tmdbData: { id: '' },
			// WikiData
			wiki: null,
			wikiData: { state: 0, data: null,
				item: '',
				wikipedia: '',
				title: '',
				mpaa: '',
				genre: '',
				colour: '',
				duration: '',
				language: '',
				aspectRatio: '',
				letterboxdID: '',
				imdbID: '',
				tmdbID: '',
				tmdbTVTD: '',
				rottenTomatoesID: '',
				metacriticID: '',
				mubiID: '',
				senscritiqueID: '',
				filmaffinityID: '',
				plexID: '',
				allocineID: '',
				allocineTVID: '',
				doubanID: '',
				mydramalistID: '',
				myanimelistID: '',
				anilistID: '',
				anidbID: '',
				budget: '',
				boxofficeUS: '',
				boxofficeWW: '',
				boxoffice: '',
				countries: [],
				instanceOf: [],
				tvStart: '',
				tvEnd: ''
			},
			wikiDataDates: { state: 0, data: null, dates: [], },
			reportAdded: false,

			reportInfo: { good: 0, warn: 0, bad: 0 },

			isAnime: false,
			isAsian: false,
			isTV: false,

			selectedTab: '',
			selectedButton: null,

			promises: [],

			stopRunning() {
				this.running = false;
			},

			async init() {
				if (this.running) return;

				this.running = true;

				// Collect Letterboxd ID from the URL
				if (this.letterboxdData.id == ''){
					var regex = new RegExp("letterboxd.com\\/film\\/(.+)\\/");
					var letterboxdUrl = window.location.href;
					if (letterboxdUrl.match(regex)){
						this.letterboxdData.id = letterboxdUrl.match(regex)[1];
					}
				}

				// Collect the Letterboxd Title and Year
				if (document.querySelector(".releaseyear a") != null && document.querySelector(".headline-1.primaryname span") != null && this.letterboxdData.year == ''){
					this.letterboxdData.year = document.querySelectorAll(".metablock .releaseyear a")[0].innerText;
					this.letterboxdData.title = document.querySelector(".headline-1.primaryname span").innerText;

					if (letterboxd.debug){
						console.log('Letterboxd Title: ' + this.letterboxdData.title + '\nLetterboxd Year: ' + this.letterboxdData.year);
					}
				}

				// Check if this is streaming or silent
				if (document.querySelector("#tab-details")){
					var headers = document.querySelectorAll('#tab-details h3 span')
					for (var i = 0; i < headers.length; i++){
						// Check studios
						if (headers[i].innerText == 'Studios'){
							var div = headers[i].parentNode.nextSibling.nextSibling;
							var studios = div.querySelectorAll('p a');
							for (var k = 0; k < studios.length; k++){
								if (this.streamingStudios.includes(studios[k].innerText)){
									this.letterboxdData.streaming = true;
									break;
								}
							}
						}

						// Check languages
						if (headers[i].innerText == 'Language'){
							var div = headers[i].parentNode.nextSibling.nextSibling;
							var languages = div.querySelectorAll('p a');
							for (var k = 0; k < languages.length; k++){
								if (languages[k].innerText == "No spoken language"){
									this.letterboxdData.silent = true;
									break;
								}
							}
						}
					}

					if (letterboxd.debug){
						console.log('Streaming: ' + this.letterboxdData.streaming + '\nSilent: ' + this.letterboxdData.silent);
					}
				}

				// Collect the IMDB and TMDB IDs
				if (this.imdbData.id == "" && document.querySelector('.micro-button') != null){
					// Gets the IMDb link and ID, and also TMDB id
					this.getIDs();

					if (letterboxd.debug){
						console.log('IMDb ID: ' + this.imdbData.id + '\nTMDB ID: ' + this.tmdbData.id);
					}
				}

				// Call WikiData
				if (this.idsCollected == true && this.wikiData.state == 0){
					this.wikiData.state = 1
					var queryString = 'https://query.wikidata.org/bigdata/namespace/wdq/sparql?format=json&query=' + letterboxd.helpers.getWikiDataQuery(this.imdbData.id, this.tmdbData.id, this.letterboxdData.id, this.isTV);
					this.promises.push(letterboxd.helpers.getData(queryString, "GET", null, null).then((value) => {
						value = JSON.parse(value.response);
						if (value != null && value.results != null && value.results.bindings != null && value.results.bindings.length > 0){
							this.wikiData.data = value.results.bindings;

							// Collect WikiData data
							//************************************
							for (var i = 0; i < this.wikiData.data.length; i++){
								var data = this.wikiData.data[i];

								this.wikiData.item = letterboxd.helpers.parseWikiDataResult(data, 'item', this.wikiData.item);
								this.wikiData.wikipedia = letterboxd.helpers.parseWikiDataResult(data, 'Wikipedia', this.wikiData.wikipedia);
								this.wikiData.title = letterboxd.helpers.parseWikiDataResult(data, 'Title', this.wikiData.title);
								this.wikiData.mpaa = letterboxd.helpers.parseWikiDataResult(data, 'MPAA', this.wikiData.mpaa);
								this.wikiData.genre = letterboxd.helpers.parseWikiDataResult(data, 'Genre', this.wikiData.genre);
								this.wikiData.colour = letterboxd.helpers.parseWikiDataResult(data, 'Color', this.wikiData.colour);
								this.wikiData.duration = letterboxd.helpers.parseWikiDataResult(data, 'Duration', this.wikiData.duration);
								this.wikiData.language = letterboxd.helpers.parseWikiDataResult(data, 'Language', this.wikiData.language);
								this.wikiData.aspectRatio = letterboxd.helpers.parseWikiDataResult(data, 'Aspect_Ratio', this.wikiData.aspectRatio);
								this.wikiData.letterboxdID = letterboxd.helpers.parseWikiDataResult(data, 'Letterboxd_ID', this.wikiData.letterboxdID);
								this.wikiData.imdbID = letterboxd.helpers.parseWikiDataResult(data, 'IMDB_ID', this.wikiData.imdbID);
								this.wikiData.tmdbID = letterboxd.helpers.parseWikiDataResult(data, 'TMDB_ID', this.wikiData.tmdbID);
								this.wikiData.tmdbTVTD = letterboxd.helpers.parseWikiDataResult(data, 'TMDBTV_ID', this.wikiData.tmdbTVTD);
								this.wikiData.rottenTomatoesID = letterboxd.helpers.parseWikiDataResult(data, 'Rotten_Tomatoes_ID', this.wikiData.rottenTomatoesID);
								this.wikiData.metacriticID = letterboxd.helpers.parseWikiDataResult(data, 'Metacritic_ID', this.wikiData.metacriticID);
								this.wikiData.mubiID = letterboxd.helpers.parseWikiDataResult(data, 'Mubi_ID', this.wikiData.mubiID);
								this.wikiData.senscritiqueID = letterboxd.helpers.parseWikiDataResult(data, 'Senscritique_ID', this.wikiData.senscritiqueID);
								this.wikiData.filmaffinityID = letterboxd.helpers.parseWikiDataResult(data, 'FilmAffinity_ID', this.wikiData.filmaffinityID);
								this.wikiData.plexID = letterboxd.helpers.parseWikiDataResult(data, 'Plex_ID', this.wikiData.plexID);
								this.wikiData.allocineID = letterboxd.helpers.parseWikiDataResult(data, 'Allocine_Film_ID', this.wikiData.allocineID);
								this.wikiData.allocineTVID = letterboxd.helpers.parseWikiDataResult(data, 'Allocine_TV_ID', this.wikiData.allocineTVID);
								this.wikiData.doubanID = letterboxd.helpers.parseWikiDataResult(data, 'Douban_ID', this.wikiData.doubanID);
								this.wikiData.mydramalistID = letterboxd.helpers.parseWikiDataResult(data, 'MyDramaList_ID', this.wikiData.mydramalistID);
								this.wikiData.myanimelistID = letterboxd.helpers.parseWikiDataResult(data, 'MAL_ID', this.wikiData.myanimelistID);
								this.wikiData.anilistID = letterboxd.helpers.parseWikiDataResult(data, 'Anilist_ID', this.wikiData.anilistID);
								this.wikiData.anidbID = letterboxd.helpers.parseWikiDataResult(data, 'Anidb_ID', this.wikiData.anidbID);
								this.wikiData.budget = letterboxd.helpers.parseWikiDataResult(data, 'Budget', this.wikiData.budget);
								this.wikiData.boxofficeUS = letterboxd.helpers.parseWikiDataResult(data, 'Box_OfficeUS', this.wikiData.boxofficeUS);
								this.wikiData.boxofficeWW = letterboxd.helpers.parseWikiDataResult(data, 'Box_OfficeWW', this.wikiData.boxofficeWW);
								this.wikiData.tvStart = letterboxd.helpers.parseWikiDataResult(data, 'TV_Start', this.wikiData.tvStart);
								this.wikiData.tvEnd = letterboxd.helpers.parseWikiDataResult(data, 'TV_End', this.wikiData.tvEnd);
								
								var instanceOf = letterboxd.helpers.parseWikiDataResult(data, 'InstanceLabel', '');
								if (instanceOf != ''){
									this.wikiData.instanceOf.push(instanceOf);
								}

								var country = {id: letterboxd.helpers.parseWikiDataResult(data, 'Country_of_Origin', ''), label: letterboxd.helpers.parseWikiDataResult(data, 'Country_of_OriginLabel', '')};
								if (!this.wikiData.countries.some(item => item.id == country.id)){
									this.wikiData.countries.push(country);
								}
							}

							// Check if the movie should be considered anime
							if (this.wikiData.myanimelistID != '' || this.wikiData.anilistID != '' || this.wikiData.anidbID != '' || this.wikiData.instanceOf.includes('original video animation') || this.wikiData.instanceOf.some(item => item.toLowerCase().includes('anime'))){
								this.isAnime = true;
							}
							// Check if asian (ie, should be on MyDramaList)
							if (this.wikiData.countries.includes('Q17') || this.wikiData.countries.includes('Q148') || this.wikiData.countries.includes('Q884') || this.wikiData.countries.includes('Q865')){
								this.isAsian = true;
							}
						}
						this.wikiData.state = 2
					}));
				}

				// Call WikiData Dates
				if (this.idsCollected == true && this.wikiDataDates.state == 0){
					this.wikiDataDates.state = 1;
					var queryString = 'https://query.wikidata.org/bigdata/namespace/wdq/sparql?format=json&query=' + letterboxd.helpers.getWikiDataDatesQuery(this.imdbData.id, this.tmdbData.id, this.letterboxdData.id, this.isTV);
					this.promises.push(letterboxd.helpers.getData(queryString, "GET", null, null).then((value) => {
						value = JSON.parse(value.response);
						if (value != null && value.results != null && value.results.bindings != null && value.results.bindings.length > 0){
							this.wikiDataDates.data = value.results.bindings;
							for (var i = 0; i < this.wikiDataDates.data.length; i++){
								var data = this.wikiDataDates.data[i];

								var date = {date: '', precision: '', country: '', city: '', format: '', score: 0};
								date.date = data.Date.value;

								if (data.Date_Precision != null && data.Date_Precision.value != "") 
									date.precision = data.Date_Precision.value;
								if (data.Date_Country != null && data.Date_Country.value != "") 
									date.country = data.Date_Country.value;
								if (data.Date_Format != null && data.Date_Format.value != "")
									date.format = data.Date_Format.value;
								
								if (data.Date_City_Country != null && data.Date_City_Country.value != ""){
									date.city = date.country
									date.country = data.Date_City_Country.value;
								}

								this.wikiDataDates.dates.push(date);
							}
						}
						this.wikiDataDates.state = 2
					}));
				}

				// Call IMDB
				if (this.idsCollected == true && this.imdbData.state == 0){
					if (this.imdbData.id != ''){
						this.imdbData.state = 1;
						this.promises.push(letterboxd.helpers.getData(this.imdbData.url, "GET", null, null).then((value) => {
							value = letterboxd.helpers.parseHTML(value.response)
							if (value != null){
								this.imdbData.data = value;
								this.getIMDBAdditional();
							}
							this.imdbData.state = 2
						}));
					}else{
						// No id, do not attemp the call again
						this.imdbData.state = -1;
					}
				}

				// Wait until all of the promises are completed
				Promise.all(this.promises).then(() => {
					// Add the report
					this.addWikiDataReport();
					this.reportAdded = true;
				});

				// Stop
				return this.stopRunning();
			},

			getIDs(){
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

					}else if (links[i].innerHTML === "TMDB"){
						// Grab the tmdb link
						tmdbLink = links[i].href;
					}
				}

				// Separate out the ID
				if (imdbLink != ""){
					this.imdbData.id = imdbLink.match(/(imdb.com\/title\/)(tt[0-9]+)(\/)/)[2];
				}

				// Separate the TMDB ID
				if (tmdbLink != ""){
					if (tmdbLink.includes('/tv/')){
						this.tmdbTV = true;
					}
					this.tmdbData.id = tmdbLink.match(/(themoviedb.org\/(?:tv|movie)\/)([0-9]+)($|\/)/)[2];
				}

				this.idsCollected = true;
			},

			getIMDBAdditional(){
				// First see if it has a parental rating
				var details = this.imdbData.data.querySelectorAll('.ipc-inline-list.ipc-inline-list--show-dividers.sc-afe43def-4.kdXikI.baseAlt li');
				if (details != null){
					for (var i = 0; i < details.length; i++){
						var a = details[i].querySelector('a');
						if (a != null){
							if (a.getAttribute('href').includes('parentalguide')){
								this.imdbData.mpaa = a.innerText.trim();
								break;
							}
						}
					}
				}

				// Next grab the metascore if it has it
				var meta = this.imdbData.data.querySelector('.metacritic-score-box');
				if (meta != null){
					this.imdbData.meta = meta.innerText.trim();
				}
			},

			addWikiDataReport(){
				if (document.querySelector('.wikidata-report')) return;
				
				// Create Div
				//*********************************************
				const section = letterboxd.helpers.createElement('section', {
					class: 'wikidata-report -clear'
				},{});

				// Create Report Header
				//*********************************************
				const header = letterboxd.helpers.createElement('h2', {
					class: 'section-heading'
				},{});
				section.append(header);
				const headerText = letterboxd.helpers.createElement('p', { class: 'report-headertext' },{});
				header.append(headerText);
				headerText.innerText = 'WikiData Report'

				// Add Show/Hide button
				const alllinkDiv = letterboxd.helpers.createElement('div', {
					class: 'all-link more-link'
				},{});
				section.append(alllinkDiv);
				
				const showButton = letterboxd.helpers.createElement('a', {
					class: 'report-toggle',
					href: window.location.pathname
				},{});
				showButton.innerText = 'Show';
				alllinkDiv.append(showButton);
				// Prevent the page load
				showButton.onclick = function() {
					return false;
				}

				// Create Tab Section
				//*********************************************
				const tabSection = letterboxd.helpers.createElement('section', {
					id: 'tabbed-content',
					class: 'film-recent-reviews -clear'
				},{
					display: 'none'
				});
				tabSection.style['margin-top'] = '0px';
				section.append(tabSection);

				// Create Tab headers
				//*********************************************
				const tabHeader = letterboxd.helpers.createElement('header', {},{});
				tabSection.append(tabHeader);
				const headerUl = letterboxd.helpers.createElement('ul', {},{});
				tabHeader.append(headerUl);

				headerUl.append(letterboxd.helpers.createTabHeader('All', 'wikidata-tab'));

				// Create the Details Tab
				//*********************************************
				headerUl.append(letterboxd.helpers.createTabHeader('Details', 'wikidata-tab-details'));
				const details = letterboxd.helpers.createElement('div', { class: 'wikidata-tab wikidata-tab-details' },{ display: 'none' });
				tabSection.append(details);
				this.createDetailsTab(details);

				if (this.wikiData.data != null){
					// Create the IDs Tab
					//********************************************
					headerUl.append(letterboxd.helpers.createTabHeader('IDs', 'wikidata-tab-id'));
					const ids = letterboxd.helpers.createElement('div', { class: 'wikidata-tab wikidata-tab-id' },{ display: 'none' });
					tabSection.append(ids);
					this.createIDsTab(ids);

					// Create the Dates Tab
					//********************************************
					headerUl.append(letterboxd.helpers.createTabHeader('Dates', 'wikidata-tab-dates'));
					const dates = letterboxd.helpers.createElement('div', { class: 'wikidata-tab wikidata-tab-dates' },{ display: 'none' });
					tabSection.append(dates);
					this.createDatesTab(dates);

					// Create the Box Office Tab
					//********************************************
					if (this.isTV == false){
						headerUl.append(letterboxd.helpers.createTabHeader('Box Office', 'wikidata-tab-boxoffice'));
						const boxoffice = letterboxd.helpers.createElement('div', { class: 'wikidata-tab wikidata-tab-boxoffice' },{ display: 'none' });
						tabSection.append(boxoffice);
						this.createBoxOfficeTab(boxoffice);
					}
				}

				// Create the Links Tab
				//********************************************
				headerUl.append(letterboxd.helpers.createTabHeader('Links', 'wikidata-tab-links'));
				const links = letterboxd.helpers.createElement('div', { class: 'wikidata-tab-links' },{ display: 'none' });
				tabSection.append(links);
				this.createLinksTab(links);


				// Adjust header based on the results
				//*********************************************
				const headerSubtext = letterboxd.helpers.createElement('p', { class: 'report-subheader' },{});
				header.append(headerSubtext);
				if (this.wikiData.data == null){
					headerSubtext.innerText = 'No Item Found';
				}else{
					headerSubtext.innerText = this.reportInfo.good + ' good / ' + this.reportInfo.warn + ' warnings / ' + this.reportInfo.bad + ' bad';
				}
				
				// Append to the page
				//*********************************************
				document.querySelector('.sidebar').after(section);
				
				// Add the tab click events
				//*****************************************************************
				$(".wikidata-report-tab").on('click', function(event){
					tabClick(event, letterboxd);
				});
				$(".report-toggle").on('click', function(event){
					reportToggle(event, letterboxd);
				});
				$(".wikidata-report-tab.all a").click();

				// Add the hover events
				//*****************************************************************
				$(".report-state-item").on("mouseover", ShowTwipsy);
				$(".report-state-item").on("mouseout", HideTwipsy);

			},

			createDetailsTab(details){
				const ul = letterboxd.helpers.createElement('ul', { class: 'avatar-list' },{ });
				details.append(ul);
				
				var imdbTitleUrl = 'https://www.imdb.com/title/' + this.imdbData.id + "/releaseinfo/";
				var imdbTechUrl = 'https://www.imdb.com/title/' + this.imdbData.id + "/technical/";

				if (this.wikiData.data != null){
					// Title
					if (this.wikiData.title != ''){
						ul.append(letterboxd.helpers.createReportBox("Title","No Issues","good",imdbTitleUrl));
					}else{
						ul.append(letterboxd.helpers.createReportBox("Title","Missing title","bad",imdbTitleUrl));
					}
					
					// Genre
					if (this.wikiData.genre != ''){
						ul.append(letterboxd.helpers.createReportBox("Genre","No Issues","good",this.imdbData.url));
					}else{
						ul.append(letterboxd.helpers.createReportBox("Genre","Missing genre(s)","bad",this.imdbData.url));
					}
					
					// Instance Of
					if (this.wikiData.instanceOf.length > 0){
						ul.append(letterboxd.helpers.createReportBox("Instance of","No Issues","good",this.imdbData.url));
					}else{
						ul.append(letterboxd.helpers.createReportBox("Instance of","Missing instance","bad",this.imdbData.url));
					}
					
					// Country of Origin
					if (this.wikiData.countries.length > 0){
						ul.append(letterboxd.helpers.createReportBox("Country","No Issues","good",this.imdbData.url));
					}else{
						ul.append(letterboxd.helpers.createReportBox("Country","Missing country","bad",this.imdbData.url));
					}
					
					// Language
					if (this.wikiData.language != '' || this.letterboxdData.silent){
						ul.append(letterboxd.helpers.createReportBox("Language","No Issues","good",this.imdbData.url));
					}else{
						ul.append(letterboxd.helpers.createReportBox("Language","Missing language","bad",this.imdbData.url));
					}

					// Color
					if (this.wikiData.colour != ''){
						ul.append(letterboxd.helpers.createReportBox("Color","No Issues","good",imdbTechUrl));
					}else{
						ul.append(letterboxd.helpers.createReportBox("Color","Missing color","bad",imdbTechUrl));
					}
					
					// Duration
					if (this.wikiData.duration != ''){
						ul.append(letterboxd.helpers.createReportBox("Duration","No Issues","good",imdbTechUrl));
					}else{
						ul.append(letterboxd.helpers.createReportBox("Duration","Missing duration","bad",imdbTechUrl));
					}
					
					// Aspect Ratio
					if (this.wikiData.aspectRatio != ''){
						ul.append(letterboxd.helpers.createReportBox("Aspect Ratio","No Issues","good",imdbTechUrl));
					}else{
						ul.append(letterboxd.helpers.createReportBox("Aspect Ratio","Missing aspect ratio","warn",imdbTechUrl));
					}
				}else{
					ul.append(letterboxd.helpers.createReportBox("WikiData","Cannot find WikiData page","bad"));
				}
			},

			createIDsTab(ids){
				const ul = letterboxd.helpers.createElement('ul', { class: 'avatar-list' },{ });
				ids.append(ul);
				
				var title = this.letterboxdData.title;
			
				// Letterboxd ID
				//***********************************************
				if (this.wikiData.letterboxdID != ''){
					ul.append(letterboxd.helpers.createReportBox("Letterboxd ID","No Issues","good"));
				}else{
					ul.append(letterboxd.helpers.createReportBox("Letterboxd ID","Missing Letterboxd ID","bad"));
				}
				
				// IMDB ID
				//***********************************************
				var imdbUrl = 'https://www.imdb.com/title/' + this.imdbData.id
				if (this.wikiData.imdbID != ''){
					ul.append(letterboxd.helpers.createReportBox("IMDb ID","No Issues","good",imdbUrl));
				}else if (this.imdbData.id == ''){
					ul.append(letterboxd.helpers.createReportBox("IMDb ID","Missing IMDb ID, but no ID found on Letterboxd page","good",imdbUrl));
				}else{
					ul.append(letterboxd.helpers.createReportBox("IMDb ID","Missing IMDb ID","bad",imdbUrl));
				}
				
				// TMDB ID
				//***********************************************
				if (this.isTV == true){
					var tmdbUrl = 'https://www.themoviedb.org/movie/' + this.tmdbData.id
					if (this.wikiData.tmdbTVTD != ''){
						ul.append(letterboxd.helpers.createReportBox("TMDB ID","No Issues","good",tmdbUrl));
					}else{
						ul.append(letterboxd.helpers.createReportBox("TMDB ID","Missing TMDB ID","bad",tmdbUrl));
					}
				}else{
					var tmdbUrl = 'https://www.themoviedb.org/tv/' + this.tmdbData.id
					if (this.wikiData.tmdbID != ''){
						ul.append(letterboxd.helpers.createReportBox("TMDB ID","No Issues","good",tmdbUrl));
					}else{
						ul.append(letterboxd.helpers.createReportBox("TMDB ID","Missing TMDB ID","bad",tmdbUrl));
					}
				}

				// Rotten Tomatoes ID
				//***********************************************
				var tomatoSearchURL = "https://www.rottentomatoes.com/search?search=" + title;
				if (this.wikiData.rottenTomatoesID != ''){
					tomatoSearchURL = "https://www.rottentomatoes.com/" +  this.wikiData.rottenTomatoesID;
					ul.append(letterboxd.helpers.createReportBox("Tomato","No Issues","good",tomatoSearchURL));
				}else{
					ul.append(letterboxd.helpers.createReportBox("Tomato","Missing Rotten Tomatoes ID","bad",tomatoSearchURL));
				}

				// Metacritic ID
				//***********************************************
				var metaSearchURL = "https://www.metacritic.com/search/" + title;
				if (this.isTV == true){
					metaSearchURL += "/?page=1&category=1";
				}else{
					metaSearchURL += "/?page=1&category=2";
				}
				if (this.wikiData.metacriticID != ''){
					metaSearchURL = "https://www.metacritic.com/" +  this.wikiData.metacriticID;
					ul.append(letterboxd.helpers.createReportBox("Meta","No Issues","good",metaSearchURL));
				}else if(this.imdbData.meta != null){
					ul.append(letterboxd.helpers.createReportBox("Meta","Missing Metacritic ID, but found in IMDB","bad",metaSearchURL));
				}else{
					ul.append(letterboxd.helpers.createReportBox("Meta","Possibly missing Metacritic ID","warn",metaSearchURL));
				}

				// MUBI ID
				//***********************************************
				var mubiUrl = 'https://mubi.com/en/search/films?query=' + title + '=&page=1&filterShowing=false';
				if (this.wikiData.mubiID != ''){
					mubiUrl = 'https://mubi.com/films/' + this.wikiData.mubiID;
					ul.append(letterboxd.helpers.createReportBox("MUBI ID","No Issues","good",mubiUrl));
				}else{
					ul.append(letterboxd.helpers.createReportBox("MUBI ID","Missing MUBI ID","bad",mubiUrl));
				}

				// FilmAffinity ID
				//***********************************************
				var filmAffUrl = 'https://www.filmaffinity.com/us/search.php?stext=' + title;
				if (this.wikiData.filmaffinityID != ''){
					filmAffUrl = 'https://www.filmaffinity.com/en/film' + this.wikiData.filmaffinityID + '.html';
					ul.append(letterboxd.helpers.createReportBox("FilmAffinity ID","No Issues","good",filmAffUrl));
				}else{
					ul.append(letterboxd.helpers.createReportBox("FilmAffinity ID","Missing FilmAffinity ID","bad",filmAffUrl));
				}

				// Senscritique ID
				//***********************************************
				var sensUrl = 'https://www.senscritique.com/search?query=' + title;
				if (this.wikiData.senscritiqueID != ''){
					sensUrl = 'https://www.senscritique.com/film/' + this.wikiData.senscritiqueID;
					ul.append(letterboxd.helpers.createReportBox("SensCritique","No Issues","good",sensUrl));
				}else{
					ul.append(letterboxd.helpers.createReportBox("SensCritique","Missing SensCritique ID","bad",sensUrl));
				}

				// Plex Media ID
				//***********************************************
				var plexUrl = 'https://app.plex.tv/desktop/#!/search?pivot=top&query=' + title
				if (this.wikiData.plexID != ''){
					plexUrl = 'https://app.plex.tv/desktop/#!/provider/tv.plex.provider.metadata/details?key=/library/metadata/' + this.wikiData.plexID;
					ul.append(letterboxd.helpers.createReportBox("Plex ID","No Issues","good",plexUrl));
				}else{
					ul.append(letterboxd.helpers.createReportBox("Plex ID","Missing Plex ID","bad",plexUrl));
				}

				// Allocine.fr
				//***********************************************
				var allocineUrl = 'https://www.allocine.fr/rechercher/?q=' + title;
				if (this.isTV == true){
					// TV
					if (this.wikiData.allocineTVID != ''){
						allocineUrl = 'https://www.allocine.fr/series/ficheserie_gen_cserie=' + this.wikiData.allocineTVID + '.html';
						ul.append(letterboxd.helpers.createReportBox("Allocine TV ID","No Issues","good",allocineUrl));
					}else{
						ul.append(letterboxd.helpers.createReportBox("Allocine TV ID","Missing Allocine Series ID","bad",allocineUrl));
					}
				}else{
					// FILM
					if (this.wikiData.allocineID != ''){
						allocineUrl = 'https://www.allocine.fr/film/fichefilm_gen_cfilm=' + this.wikiData.allocineID + '.html';
						ul.append(letterboxd.helpers.createReportBox("Allocine ID","No Issues","good",allocineUrl));
					}else{
						ul.append(letterboxd.helpers.createReportBox("Allocine ID","Missing Allocine Film ID","bad",allocineUrl));
					}
				}

				// Douban
				//***********************************************
				var doubanUrl = 'https://search.douban.com/movie/subject_search?search_text=' + title;
				if (this.isTV == true){
				}else{
					// FILM
					if (this.wikiData.doubanID != ''){
						doubanUrl = 'https://movie.douban.com/subject/' + this.wikiData.doubanID + '/';
						ul.append(letterboxd.helpers.createReportBox("Douban ID","No Issues","good",doubanUrl));
					}else{
						ul.append(letterboxd.helpers.createReportBox("Douban ID","Missing Douban ID","bad",doubanUrl));
					}
				}

				// MyDramaList ID
				//***********************************************
				// Only display if country of origin is Japan, China, or South Korea, and not Anime
				if (this.isAsian == true && this.isAnime == false){
					var dramalistUrl = 'https://mydramalist.com/search?q=' + title
					if (this.wikiData.mydramalistID != ''){
						ul.append(letterboxd.helpers.createReportBox("MyDramaList","No Issues","good",dramalistUrl));
					}else{
						ul.append(letterboxd.helpers.createReportBox("MyDramaList","Missing MyDramaList","warn",dramalistUrl));
					}
				}

				// ANIME IDS
				//***********************************************
				if (this.isAnime){
					// Anidb
					var anidbSearch = "https://anidb.net/anime/?adb.search=" + title + "&do.search=1";
					if (this.wikiData.anidbID != ''){
						var anidbURL = "https://anidb.net/anime/" + this.wikiData.anidbID;
						ul.append(letterboxd.helpers.createReportBox("AniDB ID","No Issues","good",anidbURL));
					}else{
						ul.append(letterboxd.helpers.createReportBox("AniDB ID","Missing AniDB ID","bad",anidbSearch));
					}

					// Anilist
					var anilistSearch = "https://anilist.co/search/anime?search=" + title.replaceAll(' ','+') + "&sort=SEARCH_MATCH";
					if (this.wikiData.anilistID != ''){
						var anilistURL = "https://anilist.co/anime/" + this.wikiData.anilistID;
						ul.append(letterboxd.helpers.createReportBox("AniList ID","No Issues","good",anilistURL));
					}else{
						ul.append(letterboxd.helpers.createReportBox("AniList ID","Missing AniList ID","bad",anilistSearch));
					}

					// MAL
					var malSearch = "https://myanimelist.net/search/all?q=" + title + "&cat=all";
					if (this.wikiData.myanimelistID != ''){
						var malURL = "https://myanimelist.net/anime/" + this.wikiData.myanimelistID
						ul.append(letterboxd.helpers.createReportBox("MAL ID","No Issues","good",malURL));
					}else{
						ul.append(letterboxd.helpers.createReportBox("MAL ID","Missing MyAnimeList ID","bad",malSearch));
					}
				}
			},

			createDatesTab(dates){
				const ul = letterboxd.helpers.createElement('ul', { class: 'avatar-list' },{ });
				dates.append(ul);

				// DATES
				//***********************************************
				// TV Dates
				if (this.wikiData.tvStart != ''){
					var releaseInfoUrl = 'https://www.imdb.com/title/' + this.imdbData.id + '/episodeguide';

					// Start Date
					if (this.wikiData.tvStart != ''){
						ul.append(letterboxd.helpers.createReportBox("Start Date","No Issues","good",releaseInfoUrl));
					}else{
						ul.append(letterboxd.helpers.createReportBox("Start Date","Missing TV start date","bad",releaseInfoUrl));
					}

					// End Date
					if (this.wikiData.tvEnd != null){
						ul.append(letterboxd.helpers.createReportBox("End Date","No Issues","good",releaseInfoUrl));
					}else{
						ul.append(letterboxd.helpers.createReportBox("End Date","Missing TV end date","bad",releaseInfoUrl));
					}

				}else{
					var releaseInfoUrl = 'https://www.imdb.com/title/' + this.imdbData.id + '/releaseinfo';

					// Add a date for each country of origin
					for (var i = 0; i < this.wikiData.countries.length; i++){
						var country = this.wikiData.countries[i];
						var reportTitle = "Date - " + country.label;
						var hasFullDate = this.wikiDataDates.dates.some(item => item.country == country.id && item.precision >= 11);
						var hasFullDateWW = this.wikiDataDates.dates.some(item => item.country.endsWith('Q13780930') && item.precision >= 11);
						var hasNoCountryDate = this.wikiDataDates.dates.some(item => item.country == '' && item.precision >= 11);
						var hasPartialDate = this.wikiDataDates.dates.some(item => item.country == country.id && item.precision < 11);

						if (hasFullDate){
							ul.append(letterboxd.helpers.createReportBox(reportTitle, country.label + " date - No issues", "good", releaseInfoUrl));
						}else if (hasFullDateWW){
							ul.append(letterboxd.helpers.createReportBox(reportTitle, country.label + " date - Found Worldwide date", "good", releaseInfoUrl));
						}else if (hasNoCountryDate){
							ul.append(letterboxd.helpers.createReportBox(reportTitle, country.label + " date - Found date with no country", "warn", releaseInfoUrl));
						}else if(hasPartialDate){
							ul.append(letterboxd.helpers.createReportBox(reportTitle, country.label + " date - missing full date (year only)", "bad", releaseInfoUrl));
						}else{
							ul.append(letterboxd.helpers.createReportBox(reportTitle, country.label + " date - missing", "bad", releaseInfoUrl));
						}
					}

					// Add US date of not already
					if (!this.wikiData.countries.some(item => item.id.endsWith("Q30"))){
						var reportTitle = "Date - United States"
						var hasFullDate = this.wikiDataDates.dates.some(item => item.country.endsWith("Q30") && item.precision >= 11);
						var hasFullDateWW = this.wikiDataDates.dates.some(item => item.country.endsWith('Q13780930') && item.precision >= 11);
						var hasNoCountryDate = this.wikiDataDates.dates.some(item => item.country == '' && item.precision >= 11);
						var hasPartialDate = this.wikiDataDates.dates.some(item => item.country.endsWith("Q30") && item.precision < 11);

						if (hasFullDate){
							ul.append(letterboxd.helpers.createReportBox(reportTitle, "United States date - No issues", "good", releaseInfoUrl));
						}else if (hasFullDateWW){
							ul.append(letterboxd.helpers.createReportBox(reportTitle, "United States date - Found Worldwide date", "good", releaseInfoUrl));
						}else if (hasNoCountryDate){
							ul.append(letterboxd.helpers.createReportBox(reportTitle, "United States date - Found date with no country", "warn", releaseInfoUrl));
						}else if(hasPartialDate){
							ul.append(letterboxd.helpers.createReportBox(reportTitle, "United States date - missing full date (year only)", "bad", releaseInfoUrl));
						}else{
							ul.append(letterboxd.helpers.createReportBox(reportTitle, "United States date - missing", "bad", releaseInfoUrl));
						}
					}
				}
			},

			createBoxOfficeTab(boxoffice){
				const ul = letterboxd.helpers.createElement('ul', { class: 'avatar-list' },{ });
				boxoffice.append(ul);

				// BoxOfficeMojo and The Numbers URLs
				var mojoURL = "https://www.boxofficemojo.com/title/" + this.imdbData.id;
				// Budget
				//***********************************************
				if (this.wikiData.budget != ''){
					ul.append(letterboxd.helpers.createReportBox("Budget","No Issues","good",mojoURL));
				}else if (this.letterboxdData.streaming){
					ul.append(letterboxd.helpers.createReportBox("Budget","Missing budget, but likely streaming movie","warn",mojoURL));
				}else if (this.imdbData.id == ''){
					ul.append(letterboxd.helpers.createReportBox("Budget","Missing budget, but likely indie movie","warn",mojoURL));
				}else{
					ul.append(letterboxd.helpers.createReportBox("Budget","Missing budget","bad",mojoURL));
				}

				// Box Office US
				//***********************************************
				if (this.wikiData.boxofficeUS != ''){
					ul.append(letterboxd.helpers.createReportBox("Box Office US","No Issues","good",mojoURL));
				}else if (this.letterboxdData.streaming){
					ul.append(letterboxd.helpers.createReportBox("Box Office US","Missing US box office, but likely streaming movie","warn",mojoURL));
				}else if (this.imdbData.id == ''){
					ul.append(letterboxd.helpers.createReportBox("Box Office US","Missing US box office, but likely indie movie","warn",mojoURL));
				}else{
					ul.append(letterboxd.helpers.createReportBox("Box Office US","Missing US box office","bad",mojoURL));
				}

				// Box Office WW
				//***********************************************
				if (this.wikiData.boxofficeWW != ''){
					ul.append(letterboxd.helpers.createReportBox("Box Office WW","No Issues","good",mojoURL));
				}else if (this.letterboxdData.streaming){
					ul.append(letterboxd.helpers.createReportBox("Box Office WW","Missing worldwide box office, but likely streaming movie","warn",mojoURL));
				}else if (this.imdbData.id == ''){
					ul.append(letterboxd.helpers.createReportBox("Box Office WW","Missing worldwide box office, but likely indie movie","warn",mojoURL));
				}else{
					ul.append(letterboxd.helpers.createReportBox("Box Office WW","Missing worldwide box office","bad",mojoURL));
				}
			},

			createLinksTab(links){
				const ul = letterboxd.helpers.createElement('ul', { class: 'avatar-list' },{ ['margin-bottom']: '15px' });
				links.append(ul);

				// TODO should just make these the same as the micro buttons

				if (this.wikiData.data != null){
					ul.append(letterboxd.helpers.createLink('WikiData', this.wikiData.item));
					if (this.wikiData.wikipedia != '')
						ul.append(letterboxd.helpers.createLink('Wikipedia', this.wikiData.wikipedia));
				}
				else{
					ul.append(letterboxd.helpers.createLink('WikiData New Item', 'https://www.wikidata.org/wiki/Special:NewItem'));
				}
				ul.append(letterboxd.helpers.createLink('IMDB Release Info', 'https://www.imdb.com/title/' + this.imdbData.id + '/releaseinfo'));
				ul.append(letterboxd.helpers.createLink('IMDB Parental Guide', 'https://www.imdb.com/title/' + this.imdbData.id + '/parentalguide'));
				if (this.isTV){
					ul.append(letterboxd.helpers.createLink('IMDB Episode Guide', 'https://www.imdb.com/title/' + this.imdbData.id + '/episodeguide'));
				}
				ul.append(letterboxd.helpers.createLink('BoxOfficeMojo', 'https://www.boxofficemojo.com/title/' + this.imdbData.id));
				ul.append(letterboxd.helpers.createLink('The Numbers', 'https://www.the-numbers.com/custom-search?searchterm=' + this.letterboxdData.title.replace(/ /,'+')));
			}
		},

		helpers: {
			async getData(link, method, headers, body) {
				if (letterboxd.debug)
					console.log("Wikidata-Checker | Calling: " + link);

				try {
					// Fetch options
					var options = {method: method, url: link}
					if (headers != null)
						options.headers = headers;
					if (body != null)
						options.body = body;

					// Make call
					const response = await fetch(link, options);

					// Return value
					const value = await response.text();
					return {response: value, url: response.url};
				} catch (error) {
					console.error("Error:", error);
				}
				
				return null;
			},

			parseWikiDataResult(data, tagName, currentValue){
				// Get from the data if it exists
				if (data[tagName] != null){
					return data[tagName].value;
				}

				// Return empty if it's null
				if (currentValue == null)
					return '';

				// Otherwise, return the original value
				return currentValue;
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
				if (state == "good") {
					var stateText = "✓";
					letterboxd.overview.reportInfo.good++;
				} else if (state == "warn") {
					var stateText = "!";
					letterboxd.overview.reportInfo.warn++;
				} else {
					var stateText = "X";
					letterboxd.overview.reportInfo.bad++;
				}
				const stateIcon = letterboxd.helpers.createElement('span', {
					class: 'report-state-item report-state-' + state,
					['data-original-title']: value
				});
				stateIcon.innerText = stateText;
				li.append(stateIcon);


				return li;
			},

			createTabHeader(title, target){
				const li = letterboxd.helpers.createElement('li', {
					class: 'wikidata-report-tab ' + title.toLowerCase(),
					target: target
				},{});

				const a = letterboxd.helpers.createElement('a', {
					href: window.location.pathname
				},{});
				a.innerText = title;
				li.append(a);

				// Prevent the page load
				a.onclick = function() {
					return false;
				}

				return li;
			},

			createLink(title, url){
				const a = letterboxd.helpers.createElement('a', {
					class: 'report-ext-link',
					href: url,
					target: '_blank'
				},{});
				a.innerText = title;
				
				return a;
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
			
			getWikiDataQuery(imdbId, tmdbId, letterboxdId, isTV){
				/* WikiData Date Precision values:
				0 - billion years
				1 - hundred million years
				6 - millennium
				7 - century
				8 - decade
				9 - year
				10 - month
				11 - day
				12 - hour
				13 - minute
				14 - second
				*/

				// Add the IDs to the query
				var sparqlQuery = '  VALUES ?letterboxdID { "' + letterboxdId + '"}\n';
				if (imdbId != "")
					sparqlQuery += '  VALUES ?imdbID { "' + imdbId + '"}\n';
				if (tmdbId != "")
					sparqlQuery += '  VALUES ?tmdbID { "' + tmdbId + '"}\n';

				sparqlQuery += '\n';

				// Add the initial Letterboxd ID filter
				sparqlQuery += '  { ?item p:P6127 ?letterboxdStatement. ?letterboxdStatement ps:P6127 ?letterboxdID. MINUS { ?letterboxdStatement wikibase:rank wikibase:DeprecatedRank. } }\n'

				// Add the IMDB if the ID is found
				if (imdbId != "")
					sparqlQuery += '  UNION { ?item p:P345 ?imdbStatement. ?imdbStatement ps:P345 ?imdbID. MINUS { ?imdbStatement wikibase:rank wikibase:DeprecatedRank. } }\n'

				// Add the TMDB TV if the ID is found and this is a TV show
				if (tmdbId != "" && isTV)
					sparqlQuery += '  UNION { ?item p:P4983 ?tmdbStatement. ?tmdbStatement ps:P4983 ?tmdbID. MINUS { ?tmdbStatement wikibase:rank wikibase:DeprecatedRank. } }\n'
				
				// Add the TMDB ID if found and NOT a TV show
				if (tmdbId != "" && isTV == false)
					sparqlQuery += '  UNION { ?item p:P4947 ?tmdbStatement. ?tmdbStatement ps:P4947 ?tmdbID. MINUS { ?tmdbStatement wikibase:rank wikibase:DeprecatedRank. } }\n'


				// Now the full query
				sparqlQuery = "SELECT DISTINCT ?item ?Title ?MPAA ?Genre ?Color ?Duration ?Language ?Country_of_Origin ?Country_of_OriginLabel ?Aspect_Ratio ?InstanceLabel ?Letterboxd_ID ?IMDB_ID ?TMDB_ID ?TMDBTV_ID ?Rotten_Tomatoes_ID ?Metacritic_ID ?Mubi_ID ?Senscritique_ID ?FilmAffinity_ID ?Plex_ID ?Allocine_Film_ID ?Allocine_TV_ID ?Douban_ID ?MyDramaList_ID ?MAL_ID ?Anilist_ID ?Anidb_ID ?Wikipedia ?Budget ?Box_OfficeUS ?Box_OfficeWW ?TV_Start ?TV_Start_Precision ?TV_End ?TV_End_Precision WHERE {\n" +
				"  SERVICE wikibase:label { bd:serviceParam wikibase:language \"[AUTO_LANGUAGE],en\". }\n" +
				"  \n" +
				sparqlQuery +
				"  \n" +
				"  VALUES ?domestic { wd:Q30 wd:Q49 wd:Q2017699 }\n" +
				"   \n" +
				"  OPTIONAL { ?item wdt:P1476 ?Title. } \n" +
				"  OPTIONAL { ?item wdt:P1657 ?MPAA. }\n" +
				"  OPTIONAL { ?item wdt:P136 ?Genre. } \n" +
				"  OPTIONAL { ?item wdt:P462 ?Color. } \n" +
				"  OPTIONAL { ?item wdt:P2047 ?Duration. } \n" +
				"  OPTIONAL { ?item wdt:P364 ?Language. } \n" +
				"  OPTIONAL { ?item wdt:P495 ?Country_of_Origin. } \n" +
				"  OPTIONAL { ?item wdt:P2061 ?Aspect_Ratio. } \n" +
				"  OPTIONAL { ?item wdt:P31 ?Instance. } \n" +
				"  \n" +
				"  OPTIONAL { ?item wdt:P6127 ?Letterboxd_ID. }\n" +
				"  OPTIONAL { ?item wdt:P345 ?IMDB_ID. }\n" +
				"  OPTIONAL { ?item wdt:P4947 ?TMDB_ID. }\n" +
				"  OPTIONAL { ?item wdt:P4983 ?TMDBTV_ID. }\n" +
				"  OPTIONAL { ?item wdt:P1258 ?Rotten_Tomatoes_ID. }\n" +
				"  OPTIONAL { ?item wdt:P1712 ?Metacritic_ID. }\n" +
				"  OPTIONAL { ?item wdt:P7299 ?Mubi_ID. }\n" +
				"  OPTIONAL { ?item wdt:P10100 ?Senscritique_ID. }\n" +
				"  OPTIONAL { ?item wdt:P480 ?FilmAffinity_ID. }\n" +
				"  OPTIONAL { ?item wdt:P11460 ?Plex_ID. }\n" +
				"  OPTIONAL { ?item wdt:P1265 ?Allocine_Film_ID }\n" +
				"  OPTIONAL { ?item wdt:P1267 ?Allocine_TV_ID }\n" +
				"  OPTIONAL { ?item wdt:P4529 ?Douban_ID }\n" +
				"  OPTIONAL { ?item wdt:P3868 ?MyDramaList_ID. }\n" +
				"  OPTIONAL { ?item wdt:P5646 ?Anidb_ID. }\n" +
				"  OPTIONAL { ?item wdt:P8729 ?Anilist_ID. }\n" +
				"  OPTIONAL { ?item wdt:P4086 ?MAL_ID. }\n" +
				"  OPTIONAL {\n" +
				"    ?Wikipedia schema:about ?item .\n" +
				"    ?Wikipedia schema:inLanguage \"en\" .\n" +
				"    ?Wikipedia schema:isPartOf <https://en.wikipedia.org/> .\n" +
				"  }\n" +
				"  OPTIONAL { ?item wdt:P31 ?Instance. } \n" +
				"  OPTIONAL {\n" +
				"    ?item p:P2130 ?Budget_Entry.\n" +
				"    ?Budget_Entry ps:P2130 ?Budget.\n" +
				"    MINUS { ?Budget_Entry wikibase:rank wikibase:DeprecatedRank. }\n" +
				"  }\n" +
				"  OPTIONAL {\n" +
				"    ?item p:P2142 ?Box_Office_EntryUS.\n" +
				"    ?Box_Office_EntryUS ps:P2142 ?Box_OfficeUS;\n" +
				"      pq:P3005 ?domestic\n" +
				"    MINUS { ?Box_Office_EntryUS wikibase:rank wikibase:DeprecatedRank. }\n" +
				"  }\n" +
				"  OPTIONAL {\n" +
				"    ?item p:P2142 ?Box_Office_EntryWW.\n" +
				"    ?Box_Office_EntryWW ps:P2142 ?Box_OfficeWW;\n" +
				"      pq:P3005 wd:Q13780930.\n" +
				"    MINUS { ?Box_Office_EntryWW wikibase:rank wikibase:DeprecatedRank. }\n" +
				"  }\n" +
				"  OPTIONAL { \n" +
				"    ?item p:P580 ?TV_Start_entry.\n" +
				"    ?TV_Start_entry ps:P580 ?TV_Start.\n" +
				"    ?TV_Start_entry psv:P580 [wikibase:timePrecision ?TV_Start_Precision].\n" +
				"    MINUS { ?TV_Start_entry wikibase:rank wikibase:DeprecatedRank. }\n" +
				"  }\n" +
				"  OPTIONAL { \n" +
				"    ?item p:P582 ?TV_End_entry.\n" +
				"    ?TV_End_entry ps:P582 ?TV_End.\n" +
				"    ?TV_End_entry psv:P582 [wikibase:timePrecision ?TV_End_Precision].\n" +
				"    MINUS { ?TV_End_entry wikibase:rank wikibase:DeprecatedRank. }\n" +
				"  }\n" +
				"}";
				
				return sparqlQuery;
			},
			
			getWikiDataDatesQuery(imdbId, tmdbId, letterboxdId, isTV){
				// Add the IDs to the query
				var sparqlQuery = '  VALUES ?letterboxdID { "' + letterboxdId + '"}\n';
				if (imdbId != "")
					sparqlQuery += '  VALUES ?imdbID { "' + imdbId + '"}\n';
				if (tmdbId != "")
					sparqlQuery += '  VALUES ?tmdbID { "' + tmdbId + '"}\n';

				sparqlQuery += '\n';

				// Add the initial Letterboxd ID filter
				sparqlQuery += '  { ?item p:P6127 ?letterboxdStatement. ?letterboxdStatement ps:P6127 ?letterboxdID. }\n'

				// Add the IMDB if the ID is found
				if (imdbId != "")
					sparqlQuery += '  UNION { ?item p:P345 ?imdbStatement. ?imdbStatement ps:P345 ?imdbID. }\n'

				// Add the TMDB TV if the ID is found and this is a TV show
				if (tmdbId != "" && isTV)
					sparqlQuery += '  UNION { ?item p:P4983 ?tmdbStatement. ?tmdbStatement ps:P4983 ?tmdbID. }\n'
				
				// Add the TMDB ID if found and NOT a TV show
				if (tmdbId != "" && isTV == false)
					sparqlQuery += '  UNION { ?item p:P4947 ?tmdbStatement. ?tmdbStatement ps:P4947 ?tmdbID. }\n'

				
				// Now the full query
				sparqlQuery = "SELECT DISTINCT ?item ?itemLabel ?Date ?Date_Country ?Date_CountryLabel ?Date_Precision ?Date_Format ?Date_FormatLabel ?Date_City_Country WHERE {\n" +
				"  SERVICE wikibase:label { bd:serviceParam wikibase:language \"[AUTO_LANGUAGE],en\". }\n" +
				"\n" +
				sparqlQuery +
				"\n" +
				"  ?item p:P577 ?Entry.\n" +
				"  ?Entry ps:P577 ?Date.\n" +
				"  ?Entry psv:P577 [wikibase:timePrecision ?Date_Precision].\n" +
				"  OPTIONAL { \n" +
				"    ?Entry pq:P291 ?Date_Country.\n" +
				"    OPTIONAL {\n" +
				"      ?Date_Country wdt:P17 ?Date_City_Country.\n" +
				"      FILTER NOT EXISTS { ?Date_Country wdt:P31 wd:Q6256. }\n" +
				"    }\n" +
				"  }.\n" +
				"  OPTIONAL { ?Entry pq:P437 ?Date_Format }.\n" +
				"\n" +
				"  MINUS { ?Entry wikibase:rank wikibase:DeprecatedRank. }\n" +
				"}";

				return sparqlQuery;
			},
			
			getWikiDataCountryQuery(imdbId, tmdbId, letterboxdId, isTV){
				// Add the IDs to the query
				var sparqlQuery = '  VALUES ?letterboxdID { "' + letterboxdId + '"}\n';
				if (imdbId != "")
					sparqlQuery += '  VALUES ?imdbID { "' + imdbId + '"}\n';
				if (tmdbId != "")
					sparqlQuery += '  VALUES ?tmdbID { "' + tmdbId + '"}\n';

				sparqlQuery += '\n';

				// Add the initial Letterboxd ID filter
				sparqlQuery += '  { ?item p:P6127 ?letterboxdStatement. ?letterboxdStatement ps:P6127 ?letterboxdID. MINUS { ?letterboxdStatement wikibase:rank wikibase:DeprecatedRank. } }\n'

				// Add the IMDB if the ID is found
				if (imdbId != "")
					sparqlQuery += '  UNION { ?item p:P345 ?imdbStatement. ?imdbStatement ps:P345 ?imdbID. MINUS { ?imdbStatement wikibase:rank wikibase:DeprecatedRank. } }\n'

				// Add the TMDB TV if the ID is found and this is a TV show
				if (tmdbId != "" && isTV)
					sparqlQuery += '  UNION { ?item p:P4983 ?tmdbStatement. ?tmdbStatement ps:P4983 ?tmdbID. MINUS { ?tmdbStatement wikibase:rank wikibase:DeprecatedRank. } }\n'
				
				// Add the TMDB ID if found and NOT a TV show
				if (tmdbId != "" && isTV == false)
					sparqlQuery += '  UNION { ?item p:P4947 ?tmdbStatement. ?tmdbStatement ps:P4947 ?tmdbID. MINUS { ?tmdbStatement wikibase:rank wikibase:DeprecatedRank. } }\n'

				
				// Now the full query
				sparqlQuery = "SELECT DISTINCT ?item ?Country_Of_Origin ?Country_Of_OriginLabel WHERE {\n" +
				"  SERVICE wikibase:label { bd:serviceParam wikibase:language \"[AUTO_LANGUAGE],en\". }\n" +
				"\n" +
				sparqlQuery +
				"\n" +
				"  ?item wdt:P495 ?Country_Of_Origin.\n" +
				"}";

				return sparqlQuery;
			}
		}
	};

	// Run
	letterboxd.overview.init();
};

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

// Function to show the selected tab
// triggered when the tab header is clicked
function tabClick(event, letterboxd){
	// Hide current selected tab(s)
	if (letterboxd.overview.selectedTab != ''){
		// Get the current selected tab(s) and set display to none
		var currentTabsTarget = '.' + letterboxd.overview.selectedTab;
		var currentTabs = document.querySelectorAll(currentTabsTarget);
		setTabs(currentTabs, 'none');

		letterboxd.overview.selectedButton.className = letterboxd.overview.selectedButton.className.replace(' selected', '');
	}

	// The parent li to the a
	var li = event.target.parentNode;
	
	// Get target tab/tabs
	var target = li.getAttribute('target');

	// If we are the current tab, just return as we have already hidden all tabs
	if (target == letterboxd.overview.selectedTab){
		letterboxd.overview.selectedTab = '';
		letterboxd.overview.selectedButton = null;
		return;
	}

	// Get the target tabs and set the display to block
	var targetTabs = document.querySelectorAll('.' + target);
	setTabs(targetTabs, 'block');

	li.className += ' selected';

	// Save the selected tab and button for later
	letterboxd.overview.selectedTab = target;
	letterboxd.overview.selectedButton = li;
}

// Function to set all of the tabs display value to whatever is passed in
// ie, pass targetTabs = an array of tabs, and display = 'none' and all of the tabs will be hidden
function setTabs(targetTabs, display){
	for (var i = 0; i < targetTabs.length; i++){
		var targetTab = targetTabs[i];
		targetTab.style.display = display;
	}
}

// Show or Hide the report
function reportToggle(event, letterboxd){
	const report = document.querySelector('.wikidata-report #tabbed-content');

	if (letterboxd.overview.reportShown){
		// Report is visible, hide it
		event.target.innerText = 'Show';
		report.style.display = 'none';
	}else{
		// Report is NOT visible, show it
		event.target.innerText = 'Hide';
		report.style.display = 'block';
	}

	letterboxd.overview.reportShown = !letterboxd.overview.reportShown;
}