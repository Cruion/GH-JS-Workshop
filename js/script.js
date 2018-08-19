$(document).ready(function() {

/*
                Load the Google Charts API into the browser memory so we can use it later.
*/

    google.charts.load('current', {'packages':['corechart']});

    var cleanLocalities = [];

    if (!localStorage.getItem("Suburbs")) {

        $.ajax({
            type: "GET",
/*
                This url is a SQL statement that is getting just the suburb names from
                the dataset rather than ever single record.
                SELECT%20DISTINCT%20locality%20FROM%20%225edaa132-b4fd-4a47-84d1-44bc76e80c50%22
                %20 = ' ' (space)
                %22 = '"' (double quotes)
                SELECT DISTINCT locality
                FROM 5edaa132-b4fd-4a47-84d1-44bc76e80c50
*/
            url: "https://data.qld.gov.au/api/action/datastore_search_sql?sql=SELECT%20DISTINCT%20locality%20FROM%20%225edaa132-b4fd-4a47-84d1-44bc76e80c50%22",
            success: function (data) {
                var jsonblock = JSON.parse(data);
                var localities = jsonblock.result.records;

/*
                Clean up the names of the suburbs that are retrieved from the dataset.
                Currently they are all UPPERCASE. We are changing them to Title Case.
*/

                localities.forEach(function(item, index) {
                    var suburb = item.locality;

                    suburb = suburb.toLowerCase().split(' ').map(function(word) {
                        return word.replace(word[0], word[0].toUpperCase());
                    }).join(' ');

                    cleanLocalities.push(suburb);
                });
                cleanLocalities.sort();
/*
                We store the cleaned suburbs in local storage so calls to the 
                API will be limited in the future.
*/
                var jsonStorage = JSON.stringify(cleanLocalities);
                localStorage.setItem("Suburbs", jsonStorage);

/*
                We load the auto complete asset with the cleaned suburbs so it can 
                auto complete the suburbs as we type them in the search fields.
*/
                initaliseBloodhoundTypeAhead(cleanLocalities);

            },
            dataType: "text"
        });

    } else {

/*
                Get the cleaned suburbs from local storage instead of from the API.
*/

        cleanLocalities = JSON.parse(localStorage.getItem("Suburbs"));

        initaliseBloodhoundTypeAhead(cleanLocalities);

    }

/*
                Remove error formatting from suburb fields when we type into them.
*/

    $("#suburb-select-left-input, #suburb-select-right-input").keyup(function() {
        $(this).parent().parent().removeClass("error");
    });

/*
                Start the comparison when we click on the compare button.
*/

    $("#comparison-selector button").click(function(event) {

/*
                Stop the button redirecting the page (on some browsers).
*/
        event.preventDefault();
        console.log("compare");

        var left = $("#suburb-select-left-input");
        var right = $("#suburb-select-right-input");

        var leftSuburb = left.val();
        var rightSuburb = right.val();

        console.log(cleanLocalities.indexOf(leftSuburb));

/*
                Check to see if the suburbs are not empty and are in the suburb list.
                If they are not set the field to an error field to give feedback to the
                user.
                Only continue processing if both suburbs are correct.
*/

        if (leftSuburb == "" || cleanLocalities.indexOf(leftSuburb) < 0) {
            left.parent().parent().addClass("error");
        }

        if (rightSuburb == "" || cleanLocalities.indexOf(rightSuburb) < 0) {
            right.parent().parent().addClass("error");
        }

        console.log(leftSuburb + " : " + rightSuburb);

        if (leftSuburb != "" && rightSuburb != "") {

/*
                Doing the same for both the left and the right suburbs.
                First check to see if we have a record of the suburb's data in local storage.
                If we do, output the display, otherwise get the data from the API and then 
                clean it, store it, and display it.
*/
            if (localStorage.getItem(leftSuburb)) {
                var leftRecords = JSON.parse(localStorage.getItem(leftSuburb));
/*
                Passing in the suburb data, the suburb name and the left compare article.
*/
                outputDisplay(leftRecords, leftSuburb, $("#compare-left"));
            } else {
                $.ajax({
                    type: "GET",
/*
                This url is a SQL statement that is getting just the data for a specific
                suburb from the dataset rather than the entire data.
                https://data.qld.gov.au/api/action/datastore_search_sql?sql=SELECT%20*%20from%20%225edaa132-b4fd-4a47-84d1-44bc76e80c50%22%20WHERE%20%22locality%22%20LIKE%20%27BRISBANE%27
                %20 = ' ' (space)
                %22 = '"' (double quotes)
                %27 = ''' (single quote)
                SELECT *
                FROM 5edaa132-b4fd-4a47-84d1-44bc76e80c50
                WHERE "locality" LIKE 'BRISBANE'

                We are adding BRISBANE to the url by inserting it into the string after 
                turning the string to UPPERCASE
*/
                    url: "https://data.qld.gov.au/api/action/datastore_search_sql?sql=SELECT%20*%20FROM%20%225edaa132-b4fd-4a47-84d1-44bc76e80c50%22%20WHERE%20%22locality%22%20LIKE%20%27" + leftSuburb.toUpperCase() + "%27",
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

/*
                Function to initalise the auto complete with a set of data
                https://github.com/twitter/typeahead.js
                https://github.com/twitter/typeahead.js/blob/master/doc/bloodhound.md
                https://github.com/twitter/typeahead.js/blob/master/doc/jquery_typeahead.md
*/
function initaliseBloodhoundTypeAhead(suburbs) {
/*
                Constrctor function for Bloodhound. Setting options and the search terms.
                Set to local data - cleaned suburbs
*/
    var suburbSuggestions = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.whitespace,
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: suburbs
    });


/*
                Initalise the typeahead functionality. Setting the options so it will
                give hints, highlight the possible options, and only start suggesting 
                after we start typing. Setting the source for the suburbs to the Bloodhound
                engine and limiting to ten suggestions at a time.
                We are connecting this to both of the suburb input fields.
*/
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

/*
                Take the data returned from the API for a particular suburb and store just
                the records of the data into the local storage.
*/
function cleanAndStore(data, suburb) {
    var jsonBlock = JSON.parse(data);
    var records = jsonBlock.result.records;

    var jsonStorage = JSON.stringify(records);
    localStorage.setItem(suburb, jsonStorage);

    return records;
}

/*
                Displaying the records for a suburb in a particular element.
                This can be the left or the right article. This will use the same
                function for both sides.
*/
function outputDisplay(records, suburb, parentElement) {

/*
                Extension activity
                Get image for the suburb
*/

$.ajax({
    type: "GET",
    url: "https://data.gov.au/api/3/action/datastore_search_sql?sql=SELECT%20*%20FROM%20%22f5ecd45e-7730-4517-ad29-73813c7feda8%22%20WHERE%20%22dcterms:spatial%22%20LIKE%20%27%"+suburb+"%%27%20LIMIT%201",
    success: function(data) {
        parentElement.prepend(
            $("<img>").attr("src", JSON.parse(data).result.records[0]["150_pixel_jpg"])
        );
    },
    dataType: "text"
});

/*
                Clear out the existing data and put the suburb as a title
*/
    parentElement.html("");
    parentElement.append("<h2>"+suburb+"</h2>");

/*
                Initalise two arrays - one for storage running statistics for a
                suburb and another for storing the different dwelling types in 
                a particular suburb.
*/
    var suburbStats = [];
    var dwellingTypes = [];

/*
                Go through each record in the data and add the statistics and dwelling
                types to the arrays. We will be using multidimension arrays to store
                the statistics so it will be like
                
                data -> month -> dwelling type -> [] -> weekly rent
*/
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

/*
                We are going to construct the data block that will be used by
                Google Charts to produce the graph. We want the graph to look like:

                Month       Apartment   House   Townhouse   Unit
                January     ####        ####    ####        ####
                Febuary     ####        ####    ####        ####
                March       ####        ####    ####        ####
*/
    var data = [];
    var line = [];
    line.push("Month");
    
/*
                Sort the dwelling types into alphabetical order then add them to 
                the list to be added as the first line of the data block.
*/
    dwellingTypes.sort();
    var dwellingTypeAvg = [];
    dwellingTypes.forEach(function(item, index) {
        dwellingTypeAvg[item] = null;
        line.push(item);
    });
    data.push(line);
    
/*
                Process the data for each of the months and display a tally before
                the chart
*/
    processAndDisplayMonth("January 2015", "1");
    processAndDisplayMonth("Febuary 2015", "2");
    processAndDisplayMonth("January 2015", "3");

/*
                This empty div will be used to place the chart that is produced.
*/
    parentElement.append("<div></div>");

/*
                Convert the multidimension array we produced into a Google Chart
                data table.
*/
    var dataTable = google.visualization.arrayToDataTable(data, false);

/*
                Set up the chart options for how it will be displayed
*/
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

/*
                Get the empty div we created earlier and create the chart inside it.
*/
    var chart = new google.visualization.LineChart(parentElement.children("div")[0]);

/*
                Draw the chart with the data and the options we set.
*/
    chart.draw(dataTable, options);

/*
                A subfunction used for processing the data rather than duplicating the 
                code.
*/
    function processAndDisplayMonth(monthString, monthIndex) {
        
        
        if (!suburbStats[monthIndex]) {
            return;
        }
        parentElement.append("<h3>"+monthString+"</h3>");
        count = 0;

/*
                Loop through each of the dwelling types in alphabetical order
                and generate the average rent for each of those types.
                Add that rent to the an array to use for the chart.
                
                Reduce is javascript function that is used on arrays to reduce an entire
                array to a single value using a function to handle how two elements
                are reduced left to right. We will use a simple function for this
                that just adds the elements together.
*/
        Object.keys(suburbStats[monthIndex]).sort().forEach(function (item, index) {
            var sum = suburbStats[monthIndex][item].reduce(getSum);
            var avg = sum / suburbStats[monthIndex][item].length;
            count += suburbStats[monthIndex][item].length;
            dwellingTypeAvg[item] = Math.round(avg);
        });
/*
                Display a tally of how many rental agreements were signed during the month
*/
        parentElement.append("<h4>" + count + " rental bonds signed</h4>");
/*
                Push the dwelling data to the data block.
*/
        line = [];
        line.push(monthString);
        dwellingTypes.forEach(function (item, index) {
            line.push(dwellingTypeAvg[item]);
            dwellingTypeAvg[item] = null;
        });
        data.push(line);
    }
}

/*
                The accumulator function used by the Reduce function. It simply adds the
                values together.
*/
function getSum(total, num) {
    return total + num;
}