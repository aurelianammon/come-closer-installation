// Gpio library and pin setup
var Gpio = require('onoff').Gpio;

var sensor_one = new Gpio(17, 'in', 'both', {debounceTimeout: 10, activeLow: true});
var sensor_two = new Gpio(4, 'in', 'both', {debounceTimeout: 10, activeLow: true});


// library setup
var download = require('download-file');
const fs = require('fs');
const path = require('path');
var Sound = require('node-aplay');


// Airtable API initialization
var Airtable = require('airtable');
var base = new Airtable({apiKey: 'keyPgQUmkIZ3bQwvg'}).base('appHkw3miSVWtf4je');



// function to fetch data from the airtable document
function fileUpdate() {

    console.log("-- fileupdate");

    var directory = 'rec_lib/stories';
    var table_name = 'Stereo renders final';

    fs.readdir(directory, (err, files) => {
        if (err) throw err;

        base('Table 1').select({
            maxRecords: 300,
            view: 'Grid view'
        }).firstPage(function(err, records) {
            if (err) { console.error(err); return; }
            records.forEach(function(record) {

                if (record.get(table_name) == undefined) { return; };

                var url = record.get(table_name)[0].url;
                var filename = record.get(table_name)[0].filename;
                var size = record.get(table_name)[0].size;

                var index = files.indexOf(filename);

                var options = {
                    directory: directory,
                    filename: filename
                }

                if (index > -1 && getFileSize(directory+"/"+filename) == size) {
                    files.splice(index, 1);
                } else {
                    download(url, options, function(err){
                        if (err) throw err
                        console.log("Downloaded", filename);
                    }) 
                }

            });

            for (const file of files) {
                fs.unlink(path.join(directory, file), err => {
                    if (err) throw err;
                });
            }
        });
    });

    setTimeout(function () {
        fileUpdate();
    }, 600000);
}

// return filesize
function getFileSize(path) {
    //return filesize as integer
    return fs.statSync(path)["size"];
}

// get rendom number from interval
function randomIntFromInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}


// create global lure
var lure = new Sound();

//initiate random lureing for attention
function initLure() {

    setTimeout(function () {

        if (!isPlaying) {
            isLureing = true;

            // create lure soundfile
            var lure_file = randomFile("./rec_lib/lure");
            lure = new Sound(lure_file);

            // restart lureing
            lure.on('complete', function () {
                isLureing = false;
                initLure();
            });

            lure.on('stop', function () {
                isLureing = false;
                initLure();
            });

            console.log("-- play LURE " + lure_file);
            lure.play();
        } else {
            initLure();
        }
    }, randomIntFromInterval(300000, 900000));
}


// create welcome soundfile
// var welcome = new Sound('rec_lib/lure/come_closer_wisper.wav');

// logic parameters
var sensorOneActive = false;
var sensorTwoActive = false;
var isPlaying = false;
var isLureing = false;

// soundfile list variable
var randomFileList;


// catch sensor values if change
sensor_one.watch(function (err, value) {
    sensorOneActive = value;
    sensorCheck();
});

sensor_two.watch(function (err, value) {
    sensorTwoActive = value;
    sensorCheck();
});

function sensorCheck() {

    // start sequence, if on of the sensors is active and not already playing
    if ((sensorOneActive || sensorTwoActive) && !isPlaying) {

        if (isLureing) {
            lure.stop();
        }

        console.log("-- start sequence");

        startSequence();
    }
}


// sequence is the sensors are trigered
function startSequence() {

    isPlaying = true;
    //randomFileList = randomFiles(randomIntFromInterval(6,8));
    // create fileList from all Files
    storyIndex = randomIntFromInterval(6,8);
    console.log("-- Random Number", storyIndex);

    if (index + 8 > randomFileList.length) {
        randomFileList = randomFiles(0);
        index = 1;
    }

    // console.log(randomFileList);

    // var file = randomFile("./rec_lib/come_closer");
    // var welcome = new Sound(file);

    // // call for comming closer
    // welcome.on('complete', function () {

    //     createStory(randomFileList[index-1]);

    //     index = index + 1;
    // });

    //log fileList
    console.log(randomFileList);

    createStory(randomFileList[index-1]);
    index = index + 1;
    storyIndex = storyIndex - 1;

    // setTimeout(function () {
    //     //console.log("-- play COME_CLOSER " + file);
    //     console.log(randomFileList);
    //     //welcome.play();
    // }, 500);
}

var index = 1;
var storyIndex = 1;


function createStory(filePath) {

    console.log(index, "-- play", filePath);

    var story = new Sound(randomFileList[index-1]);

    story.on('complete', function () {

        if (storyIndex == 0 || (!sensorOneActive && !sensorTwoActive)) {

            setTimeout(function () {
                console.log("-- stop sequence");
                isPlaying = false;
                storyIndex = 1;
            }, 20000);

        } else {

            createStory(randomFileList[index-1]);

            index = index + 1;
            storyIndex = storyIndex - 1;
        }
    });

    setTimeout(function () {
        story.play();
    }, randomIntFromInterval(3000, 7000));
}


//Grabs a random index between 0 and length
function randomIndex(length) {
    return Math.floor(Math.random() * (length));
}

function randomFiles(file_amount) {

    var rec_lib = "./rec_lib/stories";

    //Read the directory and get the files
    const dirs = fs.readdirSync(rec_lib)
        .map(file => {
            return path.join(rec_lib, file);
        });

    const srcs_dup = [];
    const hashCheck = {}; //used to check if the file was already added to srcs_dup
    // var numberOfFiles = dirs.length / 10; //OR whatever # you want

    if (file_amount == 0) {
        var numberOfFiles = dirs.length-1;
    } else {
        var numberOfFiles = file_amount;
    }

    //While we haven't got the number of files we want. Loop.
    while (srcs_dup.length < numberOfFiles) {
        var fileIndex = randomIndex(dirs.length-1);

        //Check if the file was already added to the array
        if (hashCheck[fileIndex] == true) {
          continue; //Already have that file. Skip it
        }

        //Add the file to the array and object
        srcs_dup.push(dirs[fileIndex]);
        hashCheck[fileIndex] = true;
    }

    return srcs_dup;
}


// random file from directory
function randomFile(directory) {

    //Read the directory and get the files
    const dirs = fs.readdirSync(directory)
        .map(file => {
            return path.join(directory, file);
        });

    var fileIndex = randomIndex(dirs.length-1);

    return dirs[fileIndex];
}


// main functionality
new Sound('rec_lib/started.wav').play();
console.log("-- system started");
//initLure();
fileUpdate();
randomFileList = randomFiles(0);

