import { key_config } from "./src/config.js";

//one time preparation
key_config.forEach((e, i) => (e.index = i));

/***
 * constants for app
 */
const MODE_GAME = "game";
const MODE_RECORD = "record";
const MODE_PLAYBACK = "playback";
const MODE_SETTINGS = "settings";
const MODE_NONE = "";
const KEY_MAP = "map";
const beats = [3, 2, 3, 2, 3, 3, 2];
const padding_count = 3;
const empty_arr = Array(3).fill("");
let new_array = [
  ...empty_arr,
  ...beats.map((z) => key_config[z].key),
  ...empty_arr,
];

//load the settings if it is there
if (window.localStorage) {
  const value = window.localStorage.getItem(KEY_MAP);
  if (value) {
    const map = value.split(",").map((z) => z.trim());
    map.forEach((k, i) => (key_config[i].key = k));
  }
}

/**
 * UI bindings
 */
function createCounter(element) {
  let val = 0;
  return {
    increment: function () {
      element.textContent = ++val;
    },
    get: function () {
      return val;
    },
    reset: function () {
      val = 0;
      element.textContent = val;
    },
  };
}

//Variables that hold handle to UI controls
let score_counter;
let start_but, record_but, playback_but, settings_but, settings_close_but;
let settings_popup, settings_node;
let current_index = 0;
let app_mode = MODE_NONE;
let nodes = [];
let ptsStart;
let playbackID;

//generic functions
const getActualPosition = () => padding_count + current_index;
//Start the game
function startGame() {
  if (app_mode != MODE_NONE) {
    return;
  }
  new_array = [
    ...empty_arr,
    ...beats.map((z) => key_config[z].key),
    ...empty_arr,
  ];
  current_index = 0;
  start_but.textContent = "End Game";
  app_mode = MODE_GAME;
  score_counter.reset();
  updateTargets();
}
//End the game
function endGame() {
  if (app_mode != MODE_GAME) {
    return;
  }
  start_but.textContent = "Start Game";
  app_mode = MODE_NONE;
  current_index = 0;
  updateTargets();
}
//start recording the keystrokes
function startRecord() {
  if (app_mode != MODE_NONE) {
    return;
  }
  nodes = [];
  current_index = 0;
  new_array = Array(2 * padding_count + 1).fill("");
  updateTargets();
  ptsStart = performance.now();
  app_mode = MODE_RECORD;
  record_but.textContent = "Stop recording";
}
//end the recording
function endRecord() {
  if (app_mode != MODE_RECORD) {
    return;
  }
  app_mode = MODE_NONE;
  record_but.textContent = "Record";
  console.log(nodes);
}
//start the playback
function startPlayback() {
  if (app_mode != MODE_NONE) {
    return;
  }
  app_mode = MODE_PLAYBACK;
  playback_but.textContent = "Stop playback";
  //setup for playback
  current_index = 0;
  ptsStart = performance.now();
  new_array = [
    ...empty_arr,
    ...nodes.map((z) => key_config[z.key].key),
    ...empty_arr,
  ];
  updateTargets();
  //call the main function
  playbackMain();
}
//end the playback
function endPlayback() {
  if (app_mode != MODE_PLAYBACK) {
    return;
  }
  //cancel the timer
  window.cancelAnimationFrame(playbackID);
  app_mode = MODE_NONE;
  playback_but.textContent = "Playback";
}
function playbackMain() {
  //we got called, pop the ip out
  cancelAnimationFrame(playbackID);
  if (app_mode != MODE_PLAYBACK) {
    return;
  }
  //get the data
  let data = nodes[current_index];
  console.log(data);
  //check the pts
  let pts = ptsStart + data.pts;
  if (pts < performance.now()) {
    //schedule the playback
    if (nodeHit(key_config[data.key])) {
      //nodeHit returns true when we need to stop the playback
      endPlayback();
      return;
    }
  }
  //schedule another round
  playbackID = requestAnimationFrame(playbackMain);
}
//entry point when the nodes are hit
function nodeHit(config) {
  if (app_mode === MODE_SETTINGS) {
    return;
  }
  config.dom.classList.add("playing");
  let audio = new Audio(config.sound);
  audio.onended = () => config.dom.classList.remove("playing");
  audio.play();
  switch (app_mode) {
    case MODE_GAME:
      {
        if (new_array[getActualPosition()] == config.key) {
          score_counter.increment();
          if (getActualPosition() + 1 + padding_count >= new_array.length) {
            alert("You won!!!!");
            endGame();
            return;
          }
          current_index++;
          updateTargets();
        }
      }
      break;
    case MODE_RECORD: {
      //add the entry into the system
      let obj = {
        key: config.index,
        pts: performance.now() - ptsStart,
      };
      nodes.push(obj);
      //refresh the system with it
      if (nodes.length < padding_count + 1) {
        //paddings
        let pad = Array(padding_count - nodes.length + 1).fill("");
        let newArr = nodes.map((z) => key_config[z.key].key);
        //update the local array
        new_array = [...pad, ...newArr, ...empty_arr];
        updateTargets();
      } else {
        //if got enough elements then just do it normally
        let idx2Split = nodes.length - padding_count - 1;
        let newArr = nodes
          .slice(idx2Split, idx2Split + padding_count * 2 + 1)
          .map((z) => key_config[z.key].key);
        new_array = [...newArr, ...empty_arr];
        updateTargets();
      }
      break;
    }
    case MODE_PLAYBACK:
      {
        if (getActualPosition() + 1 + padding_count >= new_array.length) {
          return true;
        }
        current_index++;
        updateTargets();
      }
      break;
  }
}
let listeners = [];
//make the dom element for the keys
function make_single_key_dom(config) {
  //element itself
  const element = document.createElement("div");
  element.classList.add("card", "control");
  element.setAttribute("id", config.id);
  //label
  const name = document.createElement("div");
  name.classList.add("label", "container");
  name.textContent = config.key.toUpperCase();
  element.appendChild(name);
  //key
  const key = document.createElement("div");
  key.classList.add("key", "container");
  key.textContent = config.id.replaceAll("_", " ");
  element.appendChild(key);
  //click
  element.addEventListener("click", nodeHit.bind(undefined, config));
  let callback = (e) => {
    console.log("0");
    if (e.key.toLowerCase() === config.key) {
      nodeHit(config);
    }
  };
  document.addEventListener("keydown", callback);
  listeners.push(callback);
  element.addEventListener("transitionend", () => {
    element.classList.remove("playing");
  });
  return element;
}

//update the UI
function updateTargets() {
  const targets = document.getElementById("targets");
  targets.innerHTML = "";
  const computed_array = new_array.slice(
    current_index,
    current_index + padding_count + 4
  );
  //then the cards
  computed_array.forEach((key, i) => {
    const element = document.createElement("div");
    element.setAttribute("class", "card sequence-card");
    if (i == 3) {
      element.classList.add("active");
    }
    element.textContent = key;
    targets.appendChild(element);
  });
}

//settings
//show all uis
function showSettings() {
  if (app_mode != MODE_NONE) {
    return;
  }
  app_mode = MODE_SETTINGS;
  //first unhide the the dialog
  settings_popup.classList.remove("hidden");
  //second regenerate the list
  settings_node.innerHTML = "";
  key_config.forEach((e) => {
    const element = document.createElement("div");
    element.setAttribute("data-bind", e.index);

    const span = document.createElement("span");
    span.textContent = e.id.replaceAll("_", " ");
    element.appendChild(span);

    const input = document.createElement("input");
    input.classList.add("controls");
    input.setAttribute("type", "text");
    input.maxLength = 1;
    input.value = e.key.toUpperCase();
    element.appendChild(input);

    settings_node.appendChild(element);
  });
}

function saveSettings() {
  //lets test the new data and see weather we got any duplicates
  let newData = [];
  let elements = document.querySelectorAll("#setting-popup #nodes div input");
  //map all values to array
  for (const element of elements) {
    const key = element.value.toLowerCase();
    if (newData.includes(key)) {
      alert(`Detected duplicate key ${key.toUpperCase()}`);
      return;
    }
    newData.push(key);
  }
  //run foreach to update it
  newData.forEach((k, i) => (key_config[i].key = k));
  //save this
  window.localStorage?.setItem(KEY_MAP, newData.join(","));
  alert("Done");
  closeSettings();
}

function closeSettings() {
  app_mode = MODE_NONE;
  //first hide the the dialog
  settings_popup.classList.add("hidden");
  //rerender everything
  renderControls();
  updateTargets();
}

function renderControls() {
  //find the element
  const base = document.getElementById("controls");
  //nuke it first
  base.innerHTML = "";
  listeners.forEach((z) => document.removeEventListener("keydown", z));
  //create the stuffs
  for (let config of key_config) {
    let element = make_single_key_dom(config);
    config.dom = element;
    base.appendChild(element);
  }
}

//initialize the element
window.addEventListener("load", function () {
  //bind all controls
  score_counter = createCounter(document.getElementById("score"));
  start_but = document.getElementById("start_game");
  start_but.addEventListener("click", () => {
    if (app_mode === MODE_NONE) {
      startGame();
    } else if (app_mode === MODE_GAME) {
      endGame();
    }
  });
  record_but = document.getElementById("record");
  record_but.addEventListener("click", () => {
    if (app_mode === MODE_NONE) {
      startRecord();
    } else if (app_mode === MODE_RECORD) {
      endRecord();
    }
  });
  playback_but = document.getElementById("playback");
  playback_but.addEventListener("click", () => {
    if (app_mode === MODE_NONE) {
      startPlayback();
    } else if (app_mode === MODE_PLAYBACK) {
      endPlayback();
    }
  });
  settings_but = document.getElementById("settings");
  settings_but.addEventListener("click", showSettings);
  settings_popup = document.getElementById("setting-popup");
  settings_node = document.getElementById("nodes");
  settings_close_but = document.querySelector("#setting-popup .exit-button");
  settings_close_but.addEventListener("click", closeSettings);
  //save config buttion
  document
    .getElementById("config-save")
    .addEventListener("click", saveSettings);
  renderControls();
  updateTargets();
});
