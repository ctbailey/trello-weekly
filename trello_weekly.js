/*jshint node: true */

/* Updates the due dates in a Trello list
 * so they repeat weekly.
 */
'use strict';

// require dependencies
var config = require("./config");
var Trello = require("node-trello");
var t = new Trello(config.trello_developer_key, config.trello_user_permission_token);
var moment = require("moment");
var notifier = require("node-notifier");
var path = require("path");

function run() {
  t.get("/1/lists/" + config.trello_list_id, { cards: "open", card_fields: "due,name" }, processTrelloData);  
}

function processTrelloData (err, list) {
  if (err) { throw err; }

  var timed_cards = list.cards.filter(hasDueDate);
  var this_week_cards = timed_cards.map(toThisWeek);
  this_week_cards.forEach(updateDueDateOnTrello);

  if (config.notify_on_complete) { 
    notify(this_week_cards.length, list.name)
  }
  
  process.exit(0);
}

function hasDueDate (card) { return card.due; }

function toThisWeek (card) {
  var dueMoment = moment(card.due);
  if (!dueMoment.isValid()) { throw "Invalid date string: " + card.due; }

  var thisWeek = moment().week();
  dueMoment.week(thisWeek);

  return {
    'name': card.name,
    'id': card.id,
    'due': dueMoment.format()
  };
}

function updateDueDateOnTrello (card) {
  var handleResponse = function (err, data) {
    if (err) { throw err; }
  };
  t.put("/1/cards/" + card.id + "/due", { value: card.due }, handleResponse);
}

function notify (numCardsUpdated, listName) {
  notifier.notify({
    title: config.app_name,
    message: numCardsUpdated + ' cards updated on Trello from list ' + listName,
    icon: path.join(__dirname, 'glyphicons-46-calendar.png'),
    wait: true
  });
}

run();