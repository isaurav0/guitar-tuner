// Define the set of test frequencies that we'll use to analyze microphone data.
var C2 = 65.41; // C2 note, in Hz.
var stringToTune, stringFrequency, data;
var notes = [ "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" ];
var test_frequencies = [];
for (var i = 0; i < 30; i++)
{
	var note_frequency = C2 * Math.pow(2, i / 12);
	var note_name = notes[i % 12];
	var note = { "frequency": note_frequency, "name": note_name };
	var sharp = { "frequency": note_frequency * Math.pow(2, 1 / 48), "name": note_name + " (a bit sharp)" };
	var flat = { "frequency": note_frequency * Math.pow(2, -1 / 48), "name": note_name + " (a bit flat)" };
	test_frequencies = test_frequencies.concat([ flat, note, sharp ]);
}


window.addEventListener("load", initialize);

var correlation_worker = new Worker("correlation_worker.js");
correlation_worker.addEventListener("message", interpret_correlation_result);

function initialize()
{
	var get_user_media = navigator.getUserMedia;
	get_user_media = get_user_media || navigator.webkitGetUserMedia;
	get_user_media = get_user_media || navigator.mozGetUserMedia;
	get_user_media.call(navigator, { "audio": true }, use_stream, function() {});
}

function use_stream(stream)
{
	var audio_context = new AudioContext();
	var microphone = audio_context.createMediaStreamSource(stream);
	window.source = microphone; // Workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=934512
	var script_processor = audio_context.createScriptProcessor(1024, 1, 1);

	script_processor.connect(audio_context.destination);
	microphone.connect(script_processor);

	var buffer = [];
	var sample_length_milliseconds = 100;
	var recording = true;

	window.capture_audio = function(event)
	{
		if (!recording)
			return;

		buffer = buffer.concat(Array.prototype.slice.call(event.inputBuffer.getChannelData(0)));
		// Stop recording after sample_length_milliseconds.
		if (buffer.length > sample_length_milliseconds * audio_context.sampleRate / 1000)
		{
			recording = false;

			correlation_worker.postMessage
			(
				{
					"timeseries": buffer,
					"test_frequencies": test_frequencies,
					"sample_rate": audio_context.sampleRate
				}
			);

			buffer = [];
			setTimeout(function() { recording = true; }, 250);
		}
	};

	script_processor.onaudioprocess = window.capture_audio;
}

function interpret_correlation_result(event)
{
	var timeseries = event.data.timeseries;
	var frequency_amplitudes = event.data.frequency_amplitudes;

	// Compute the (squared) magnitudes of the complex amplitudes for each
	// test frequency.
	var magnitudes = frequency_amplitudes.map(function(z) { return z[0] * z[0] + z[1] * z[1]; });

	// Find the maximum in the list of magnitudes.
	var maximum_index = -1;
	var maximum_magnitude = 0;
	for (var i = 0; i < magnitudes.length; i++)
	{
		if (magnitudes[i] <= maximum_magnitude)
			continue;

		maximum_index = i;
		maximum_magnitude = magnitudes[i];
	}

	// Compute the average magnitude. We'll only pay attention to frequencies
	// with magnitudes significantly above average.
	var average = magnitudes.reduce(function(a, b) { return a + b; }, 0) / magnitudes.length;
	var confidence = maximum_magnitude / average;
	var confidence_threshold = 10; // empirical, arbitrary.
	if (confidence > confidence_threshold)
	{
		dominant_frequency = test_frequencies[maximum_index];
		document.getElementById("note-name").textContent = dominant_frequency.name;
		document.getElementById("frequency").textContent = dominant_frequency.frequency;
		// console.log(dominant_frequency)
		tune(dominant_frequency);

	}
}

var playing = false;
function toggle_playing_note()
{
	playing = !playing;
	if (playing)
		gain_node.gain.value = 0.1;
	else
		gain_node.gain.value = 0;
}

// function send(dominant_frequency)
// {
// }



function onClickHandler(e){
	// console.log(e.target.id);

	const activeObj = {
		Elow: false,
		A: false,
		D: false,
		G: false,
		B: false,
		E: false,
		standard: false,
	};
	
	stringToTune = e.target.id;
	stringFrequency = e.target.value;
	// e.target.style.backgroundColor ="red";
	activeObj[e.target.id] = !activeObj[e.target.id];
	// console.log(activeObj[stringToTune]);

	if(e.target.value=='standard'){
		stringToTune= null;
	}

	if(e.target.id=='Elow')
		stringToTune='E'

	for(var key in activeObj){
		if(activeObj[key]) 
			e.target.style.backgroundColor = "red";
		else {
			document.getElementById(key).style.backgroundColor = 'rgb(194,183,125)';
		}


	}

	


	document.getElementById('string').textContent = stringToTune;
	// console.log(e.target.id)
	// console.log(e.target.value)
	// tune(dominant_frequency, e.target.id);
}

function tune(dominant_frequency){
	// console.log(dominant_frequency)
	
	if(stringToTune!=null){	
		// document.getElementById("canvas-id").setAttribute("majorTicks", ["low",stringToTune,"high"]);
		
		if(stringFrequency<dominant_frequency.frequency){
			document.getElementById('message').textContent = "Tune down";
			if(dominant_frequency.name==stringToTune+' (a bit sharp)')
				meter(stringToTune,60)
			else if(stringToTune+'#' ==dominant_frequency.name)
				meter(stringToTune,70)
			else if(stringToTune+'#'+' (a bit sharp)'==dominant_frequency.name)
				meter(stringToTune, 80)
			else
				meter(stringToTune, 100)
		}

		else if(stringFrequency>dominant_frequency.frequency){
			document.getElementById('message').textContent = "Tune up";
			if(dominant_frequency.name==stringToTune+' (a bit flat)')
				meter(stringToTune,40)
			else
				meter(stringToTune,20)
			// var percent = (stringFrequency-dominant_frequency.frequency)/stringFrequency*100*5;
		}
		else{
			document.getElementById('message').textContent = "Congrats tuned";
			meter(stringToTune, 50)
		}
	}

	else{
		meter(dominant_frequency.name, 50)
		document.getElementById('string').textContent = "Not chosen"
	}
}


function meter(stringToTune, data){
	var gauge = new RadialGauge({
	    renderTo: 'canvas-id',
	    width: 300,
	    height: 200,
	    units: "Tuner",
	    minValue: 0,
	    value: data,
	    startAngle: 90,
	    ticksAngle: 180,
	    valueBox: false,
	    maxValue: 100,
	    majorTicks: [
	        "low",
	        stringToTune,
	        "high"
	    ],
	    minorTicks: 5,
	    strokeTicks: true,
	    highlights: [
	        {
	          "from": 0,
	          "to": 20,
	          "color": "yellow"
	        },
	        {
	          "from": 20,
	          "to": 80,
	          "color": "orange"
	        },
	        {
	            "from": 40,
	            "to": 60, 
	            "color": "rgb(109,253,48)"
	        },
	        {
	        	 "from": 80,
	            "to": 100, 
	            "color": "red"
	        }
	    ],
	    colorPlate: "#fff",
	    borderShadowWidth: 0,
	    borders: false,
	    needleType: "arrow",
	    needleWidth: 5,
	    needleCircleSize: 2,
	    needleCircleOuter: true,
	    needleCircleInner: false,
	    animationDuration: 100,
	    animationRule: "linear"
	}).draw();
}

// document.getElementById("canvas-id").setAttribute("data-value", 90);


