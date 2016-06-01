(function(){
	var $,
		readyState = 0,
		templates = {
			modal : '\
				<div class="modal fade" id="ASHCModal" tabindex="-1" role="dialog" aria-labelledby="ASHCModalLabel">\
				  <div class="modal-dialog modal-lg" role="document">\
				    <div class="modal-content">\
				      <div class="modal-header">\
				        <h4 class="modal-title" id="ASHCModalLabel">Amazon shopping history charts</h4>\
				      </div>\
				      <div class="ashc-modal-body modal-body">\
				        ...\
				      </div>\
				    </div>\
				  </div>\
				</div>\
			'
		},
		supportedVersions = ['de'],
		detectedVersion = false,
		urlTemplates = {
			de : 'https://www.amazon.de/gp/your-account/order-history/?orderFilter=year-{year}&startIndex={index}'

		}


	if('ASHC' in window){
		return alert([
				'ASHC is already loaded or currently loading!',
				'If you see nothing, the loading may have failed or',
				'your local version of amazon is not supported yet!',
				'Currently supported amazon sites:',
				'- amazon.de'
			].join('\n')
		);
	}

	window.ASHC = {
		state : 'initializing',
		data : {}
	};

	(function(){
		//via https://gist.github.com/hagenburger/500716
	    var script = document.createElement('script'),
	        loaded;
	    script.setAttribute('src', 'https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.4/jquery.min.js');

	      script.onreadystatechange = script.onload = function() {
	        if (!loaded) {
	          init();
	        }
	        loaded = true;
	      };

	    document.getElementsByTagName('head')[0].appendChild(script);
	})();


	function init(){
		$ = jQuery;
		$('head').append( $('<link rel="stylesheet" type="text/css" />').attr('href', 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css') );
		$.getScript('https://cdnjs.cloudflare.com/ajax/libs/ICanHaz.js/0.10.3/ICanHaz.min.js', ready)
		$.getScript('https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js', ready)
		$.getScript('https://www.gstatic.com/charts/loader.js', ready)
	}

	function ready(){
		readyState++;
		if(readyState < 3){
			return false;
		}


		$('body').append($(templates.modal));
		$('#ASHCModal').modal({
			backdrop : 'static',
			keyboard : false
		});
		getAmazonVersion();
		
		if(!detectedVersion){
			return false;
		}

		google.charts.load('current', {'packages':['corechart']});

		$('<iframe>')
			.prop('id','ashc-iframe')
			.css({
				width : 1920,
				height: 1080,
				position : 'absolute',
				left : -1920,
				top : -1080
			})
			.appendTo('body')
			.load(processIframeContent)

		var years = $.map($('#orderFilter option[value^=year]'),function(item,i){
			return $(item).val().substr(-4);
		}), year;

		while(year = years.shift()){
			window.ASHC.data[year] = {pages : 0, page : 0, data : {}, done : false};
		}


		fetchData(2016);

	}


	function fetchData(year){


		fetchDocument(year,window.ASHC.data[year].page);

	}

	function fetchDocument(year,index){

		var url = urlTemplates[detectedVersion]
					.replace(/\{year\}/,year)
					.replace(/\{index\}/,index * 10);



		$('.ashc-modal-body').text('fetching ' + year + ', page ' + index + ' of ' + (window.ASHC.data[year].pages === 0?'?':window.ASHC.data[year].pages ));

		$('#ashc-iframe')
			.data('year',year)
			.data('index',index)
			.prop('src',url);
	}



	function processIframeContent(){
		var pages = 0,
			iframe = $('#ashc-iframe'),
			contents = iframe.contents(),
			year = iframe.data('year'),
			index = iframe.data('index'),
			months = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

		pages = parseInt(contents.find('.a-pagination .a-normal:last').text(),10);

		if(window.ASHC.data[year].pages === 0 && pages > 1){
			window.ASHC.data[year].pages = pages;
		}


		contents.find('.a-box.a-color-offset-background.order-info').each(function(i,item){
			try{
				var rawDate = $(item).find('.a-color-secondary.value').eq(0).text().trim().match(/(\d+)\.\s([ä\w]+)\s(\d{4})/),
					day = rawDate[1],
					month = $.inArray(rawDate[2],months),
					year = rawDate[3],
					date = +new Date(year,month,day);
			}catch(e){
//				console.log($(item).find('.a-color-secondary.value').eq(0).text().trim());
//				console.log(rawDate);
			}

			var amount = parseFloat($(item).find('.a-color-secondary.value').eq(1).text().trim().replace(/[^\d]/g,''));
			
			if(window.ASHC.data[year].data[date]){
				window.ASHC.data[year].data[date] += amount;
			}else{
				window.ASHC.data[year].data[date] = amount;
			}
		});	


		
		window.ASHC.data[year].page++;
		if(window.ASHC.data[year].page < window.ASHC.data[year].pages){
			fetchData(year)
		}else{
			if(window.ASHC.data[year-1]){
				fetchData(year - 1);
			}else{
				//console.log('ASF');
				render(window.ASHC);
			}
		}


	}

	function getAmazonVersion(){
		version = /\.(\w{2,4})$/.exec(window.location.host)[1];
		if($.inArray(version,supportedVersions) === -1){
			return $('.ashc-modal-body').text('Sorry, this amazon version ('+version+') is not supported yet');
		}
		detectedVersion = version;
	}

	function render(raw){

		$('.ashc-modal-body').empty();

     

		var total = [['Year', 'Euro']];


		for( var year in raw.data){
			var yAmount = 0;
			for( var date in raw.data[year].data ){
				yAmount += raw.data[year].data[date];
			}
			total.push([year,yAmount / 100]);
		}

    	$('<div>')
    		.prop('id','ashc-years')
    		.css({
    			width:850,
    			height:500
    		})
    		.appendTo('.ashc-modal-body')

        var data = google.visualization.arrayToDataTable(total);
        var options = {
          title: 'Amount spent per year',
          hAxis: {title: 'Year',  titleTextStyle: {color: '#333'}},
          vAxis: {minValue: 0}
        };

        var chart = new google.visualization.AreaChart(document.getElementById('ashc-years'));
        chart.draw(data, options);



        var years = {};
        var totalMonths = [['Month','Euro']];
        var totalDays = [
        	['Day','Euro'],
        	['Sun',0],
        	['Mon',0],
        	['Tue',0],
        	['Wed',0],
        	['Thu',0],
        	['Fri',0],
        	['Sat',0]
        ];



    	for( var i = 0; i < 12; i++){
    		totalMonths.push([i+1,0]);
    	}


        for( var year in raw.data){
        	years[year] = [['Month','Euro']];
        	for( var i = 0; i < 12; i++){
        		years[year].push([i+1,0]);
        	}
        	for( var date in raw.data[year].data){
        		var d = new Date(Number(date)),
        			m = d.getMonth();
        			day = d.getDay();


        		totalDays[day+1][1] += raw.data[year].data[date] / 100;


        		totalMonths[m+1][1] += raw.data[year].data[date] / 100;
        		years[year][m+1][1] += raw.data[year].data[date] / 100;
        	}
        }



        var yearKeys = Object.keys(years).reverse();

        for( var i = 0, year; year = yearKeys[i]; i++){
        	$('<div>')
        		.prop('id','ashc-year_'+year)
        		.css({
        			width:850,
        			height:500
        		})
        		.appendTo('.ashc-modal-body');

	        var data = google.visualization.arrayToDataTable(years[year]);
	        var options = {
	          title: 'Amount spent in '+year+' per month',
	          hAxis: {title: year,  titleTextStyle: {color: '#333'}},
	          vAxis: {minValue: 0}
	        };

	        var chart = new google.visualization.AreaChart(document.getElementById('ashc-year_'+year));
	        chart.draw(data, options);
        }

    	$('<div>')
    		.prop('id','ashc-totalmonths')
    		.css({
    			width:850,
    			height:500
    		})
    		.appendTo('.ashc-modal-body');

        var data = google.visualization.arrayToDataTable(totalMonths);
        var options = {
          title: 'Overall mount spent in per month',
          hAxis: {title: year,  titleTextStyle: {color: '#333'}},
          vAxis: {minValue: 0}
        };

        var chart = new google.visualization.AreaChart(document.getElementById('ashc-totalmonths'));
        chart.draw(data, options);

    	$('<div>')
    		.prop('id','ashc-totalDays')
    		.css({
    			width:850,
    			height:500
    		})
    		.appendTo('.ashc-modal-body');

        var data = google.visualization.arrayToDataTable(totalDays);
        var options = {
          title: 'Overall mount spent in per day',
          hAxis: {title: year,  titleTextStyle: {color: '#333'}},
          vAxis: {minValue: 0}
        };

        var chart = new google.visualization.AreaChart(document.getElementById('ashc-totalDays'));
        chart.draw(data, options);
      
	}

})();