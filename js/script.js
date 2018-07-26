$(document).ready(function() {

    google.charts.load('current', {'packages':['corechart']});

    var cleanLocalities = [];

    if (!localStorage.getItem("Suburbs")) {

        $.ajax({
            type: "GET",
            url: "https://data.qld.gov.au/api/action/datastore_search_sql?sql=SELECT%20DISTINCT%20locality%20from%20%225edaa132-b4fd-4a47-84d1-44bc76e80c50%22",
            success: function (data) {
                var jsonblock = JSON.parse(data);
                var localities = jsonblock.result.records;

                localities.forEach(function(item, index) {
                    var suburb = item.locality;

                    suburb = suburb.toLowerCase().split(' ').map(function(word) {
                        return word.replace(word[0], word[0].toUpperCase());
                    }).join(' ');

                    cleanLocalities.push(suburb);
                });
                cleanLocalities.sort();
                var jsonStorage = JSON.stringify(cleanLocalities);
                localStorage.setItem("Suburbs", jsonStorage);

                initaliseBloodhoundTypeAhead(cleanLocalities);

            },
            dataType: "text"
        });

    } else {

        cleanLocalities = JSON.parse(localStorage.getItem("Suburbs"));

        initaliseBloodhoundTypeAhead(cleanLocalities);

    }

    $("#suburb-select-left-input, #suburb-select-right-input").keyup(function() {
        $(this).parent().parent().removeClass("error");
    });

    $("#comparison-selector button").click(function(event) {
        event.preventDefault();
        console.log("compare");

        var left = $("#suburb-select-left-input");
        var right = $("#suburb-select-right-input");

        var leftSuburb = left.val();
        var rightSuburb = right.val();

        console.log(cleanLocalities.indexOf(leftSuburb));
        
        if (leftSuburb == "" || cleanLocalities.indexOf(leftSuburb) < 0) {
            left.parent().parent().addClass("error");
        }

        if (rightSuburb == "" || cleanLocalities.indexOf(rightSuburb) < 0) {
            right.parent().parent().addClass("error");
        }

        console.log(leftSuburb + " : " + rightSuburb);

        if (leftSuburb != "" && rightSuburb != "") {
            if (localStorage.getItem(leftSuburb)) {
                var leftRecords = JSON.parse(localStorage.getItem(leftSuburb));
                outputDisplay(leftRecords, leftSuburb, $("#compare-left"));
            } else {
                $.ajax({
                    type: "GET",
                    url: "https://data.qld.gov.au/api/action/datastore_search_sql?sql=SELECT%20*%20from%20%225edaa132-b4fd-4a47-84d1-44bc76e80c50%22%20WHERE%20%22locality%22%20LIKE%20%27" + leftSuburb.toUpperCase() + "%27",
                    success: function(data) {
                        var leftRecords = cleanAndStore(data, leftSuburb);
                        outputDisplay(leftRecords, leftSuburb, $("#compare-left"));
                    },
                    dataType: "text"
                });
            }

            if (localStorage.getItem(rightSuburb)) {
                var rightRecords = JSON.parse(localStorage.getItem(rightSuburb));
                outputDisplay(rightRecords, rightSuburb, $("#compare-right"));
            } else {
                $.ajax({
                    type: "GET",
                    url: "https://data.qld.gov.au/api/action/datastore_search_sql?sql=SELECT%20*%20from%20%225edaa132-b4fd-4a47-84d1-44bc76e80c50%22%20WHERE%20%22locality%22%20LIKE%20%27" + rightSuburb.toUpperCase() + "%27",
                    success: function(data) {
                        var rightRecords = cleanAndStore(data, rightSuburb);
                        outputDisplay(rightRecords, rightSuburb, $("#compare-right"));
                    },
                    dataType: "text"
                });
            }
        }


    });
});

function initaliseBloodhoundTypeAhead(suburbs) {
    var suburbSuggestions = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.whitespace,
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: suburbs
    });

    $(".suburb-select input").typeahead({
        hint: true,
        highlight: true,
        minLength: 1
    },
    {
        name: 'suburbs',
        source: suburbSuggestions,
        limit: 10
    });
}

function cleanAndStore(data, suburb) {
    var jsonBlock = JSON.parse(data);
    var records = jsonBlock.result.records;

    var jsonStorage = JSON.stringify(records);
    localStorage.setItem(suburb, jsonStorage);

    return records;
}

function outputDisplay(records, suburb, parentElement) {
    parentElement.html("");
    parentElement.append("<h2>"+suburb+"</h2>");

    var suburbStats = [];

    var dwellingTypes = [];

    records.forEach(function(item, index) {
        
        if ((item["Month"] in suburbStats) == false) {
            suburbStats[item["Month"]] = [];
        }

        if ((item["Dwelling Type"] in suburbStats[item["Month"]]) == false) {
            suburbStats[item["Month"]][item["Dwelling Type"]] = [];
        }

        if (dwellingTypes.indexOf(item["Dwelling Type"]) < 0) {
            dwellingTypes.push(item["Dwelling Type"]);
        }

        suburbStats[item["Month"]][item["Dwelling Type"]].push(parseInt(item["weekly-rent"]));
    });

    var data = [];

    var line = [];
    line.push("Month");
    
    dwellingTypes.sort();
    var dwellingTypeAvg = [];
    dwellingTypes.forEach(function(item, index) {
        dwellingTypeAvg[item] = null;
        line.push(item);
    });
    data.push(line);

    parentElement.append("<h3>January 2015</h3>");
    var count = 0;
    Object.keys(suburbStats["1"]).sort().forEach(function(item, index) {
        //parentElement.append("<h4>"+item+"</h4>");
        var sum = suburbStats["1"][item].reduce(getSum);
        var avg = sum / suburbStats["1"][item].length;
        //parentElement.append("<p>Average Rent: $"+Math.round(avg)+"<br>Total Properties: "+suburbStats["1"][item].length+"</p>");
        count += suburbStats["1"][item].length;

        dwellingTypeAvg[item] = Math.round(avg);
    });
    parentElement.append("<h4>"+count+" rental bonds signed</h4>");

    line=[];
    line.push("January 2015");
    dwellingTypes.forEach(function(item, index) {
        line.push(dwellingTypeAvg[item]);
        dwellingTypeAvg[item] = null;
    });
    data.push(line);
    

    parentElement.append("<h3>February 2015</h3>");
    count = 0;
    Object.keys(suburbStats["2"]).sort().forEach(function(item, index) {
        //parentElement.append("<h4>"+item+"</h4>");
        var sum = suburbStats["2"][item].reduce(getSum);
        var avg = sum / suburbStats["2"][item].length;
        //parentElement.append("<p>Average Rent: $"+Math.round(avg)+"<br>Total Properties: "+suburbStats["2"][item].length+"</p>");
        count += suburbStats["2"][item].length;

        dwellingTypeAvg[item] = Math.round(avg);
    });
    parentElement.append("<h4>"+count+" rental bonds signed</h4>");

    line=[];
    line.push("February 2015");
    dwellingTypes.forEach(function(item, index) {
        line.push(dwellingTypeAvg[item]);
        dwellingTypeAvg[item] = null;
    });
    data.push(line);

    parentElement.append("<h3>March 2015</h3>");
    count = 0;
    Object.keys(suburbStats["3"]).sort().forEach(function(item, index) {
        //parentElement.append("<h4>"+item+"</h4>");
        var sum = suburbStats["3"][item].reduce(getSum);
        var avg = sum / suburbStats["3"][item].length;
        //parentElement.append("<p>Average Rent: $"+Math.round(avg)+"<br>Total Properties: "+suburbStats["3"][item].length+"</p>");
        count += suburbStats["3"][item].length;

        dwellingTypeAvg[item] = Math.round(avg);
    });
    parentElement.append("<h4>"+count+" rental bonds signed</h4>");

    parentElement.append("<div></div>");
    
    line=[];
    line.push("March 2015");
    dwellingTypes.forEach(function(item, index) {
        line.push(dwellingTypeAvg[item]);
        dwellingTypeAvg[item] = null;
    });
    data.push(line);
    
    var dataTable = google.visualization.arrayToDataTable(data, false);

    var options = {
        title: "Average Rent in "+suburb,
        subtitle: "by Dwelling Type - Quarter 1, 2015",
        legend: { position: 'bottom' },
        vaxis: {
            maxValue: 1000
        },
        width: parentElement.width() * 0.9,
        height: parentElement.width() * 0.8
    }

    var chart = new google.visualization.LineChart(parentElement.children("div")[0]);

    chart.draw(dataTable, options);
}

function getSum(total, num) {
    return total + num;
}