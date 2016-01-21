var Twit = require("twit");
const consumer = require("./config.js").c;
const access = require("./config.js").a;
const Rx = require('rx');
const myAccount = "@58ryt";
const _ = require('lodash');
const http = require('http');
const fs = require('fs');
const FilePath = "./userList.json";
const CommandPath = "./command.json";
const Promise = require('promise');
const itunes = require('./itunes.js').itunesTrack;
const objectCombine = require('./utils.js').objectCombine
var oldTime = new Date().getTime();
var newTime;
var twitFlag = true;


var list = JSON.parse(fs.readFileSync('./userList.json', 'utf8'));

var commandJSON = JSON.parse(fs.readFileSync(CommandPath, 'utf8'));
var initialCommands = _.first(commandJSON.commands);

const additionalCommand = {
  'it': itunes,
  'reg': registerReaction,
  'del': removeReaction
};

var commands = Object.assign({},_.reduce(initialCommands, (result, text, key) => {
  result[key] = createCommand(text);
  return result;
}, {}),additionalCommand);


var twitter = new Twit({
 consumer_key: consumer.Key,
 consumer_secret: consumer.Secret,
 access_token: access.Token,
 access_token_secret: access.Stoken
});

function createCommand(initial) {
  return (text) => {
    return new Promise(resolve => {
      resolve(initial);
    })
  }
}
const command = checkText(commands);
const whiteCheck = whiteList(list.users);
const tweet$ = new Rx.Subject();
var stream = twitter.stream('user');

stream.on('tweet', tweet => {
 newTime = new Date().getTime();
 if(oldTime + 1000 * 1 < newTime) {
   twitFlag = true;
 }
 if(twitFlag) {
   tweet$.onNext(parseTweet(tweet));
 } else {
   console.log('冷却');
 }
});

//tweet$.subscribe(console.log);

const replay$ = tweet$
  .filter(tweet => whiteCheck(tweet.account));
const convertText$ = replay$.flatMap((tweet) => Rx.Observable.fromPromise(command(tweet)))
  .filter(tweet => tweet.text.length > 0);

convertText$.subscribe(s => {
  console.log(s);
  if(twitFlag) {
    sendPost(s);
    oldTime = new Date().getTime();
    twitFlag = false;
  }
});

const favStream = new Rx.Subject();
//stream.on('favorite', msg => {
//  favStream.onNext(favoriteParse(msg.target_object))
//});

function addWhiteList(fav) {
  list.users.push(fav.user.screen_name);
  list.users = _.uniq(list.users);
  console.log(list.users);
  fs.writeFile(FilePath, JSON.stringify(list), res => console.log('write'))
}

function addUserList(name) {
  const fav = {user: {screen_name: name}}
  addWhiteList(fav);
}

favStream.subscribe(addWhiteList);

function sendPost(tweet) {
  twitter.post('statuses/update',
    {status: `${tweet.user} >> ${tweet.text}`, in_reply_to_status_id: tweet.repId},
    (err, data, response) => {
      console.log(err);
    })
}

function parseTweet(tweet) {
  return {
    text: tweet.text,
    user: `@${tweet.user.screen_name}`,
    repId: tweet.id_str,
    account: tweet.user.screen_name
  }
}

function checkReply(text, myAccount) {
  return myAccount === text.split(" ")[0];
}

function checkText(commands) {
  return (tweet) => {
    const word = tweet.text.toLowerCase();
    const keys = _.keys(commands);
    const results = _.compact(_.map(keys, name => matchFunction(word, name)));
    console.log(results)
    return new Promise(resolve => {
      Promise.all(results).then(values => {
        resolve (objectCombine(tweet, {text: values.toString()}));
      })
    });
  };
}


function matchFunction(word, name) {
  const regexp = new RegExp(name + "*");
  const match = regexp.exec(word);
  return ((match, text) => {
    if (_.isFunction(commands[match])) {
      return commands[match](text)
    }
    return 0
  })(match, word);
}

function whiteList(list) {
  return (user) => {
    var bool = _.includes(list, user);
    console.log("white check"+bool);
    return bool
  }
}

function favoriteParse(target) {
  return {
    user: target.user,
    text: target.text
  }
}

function registerReaction(text) {
  const command = text.split(' ');
  const reaction = parseCommand(command[1],command[2]);
  return new Promise(resolve => {
    if(command[0] === "reg" && _.isObject(reaction)) {
      const newCommands = objectCombine(initialCommands,reaction);
      initialCommands = newCommands;
      var newJson = [newCommands];
      const commandKey = commands[_.first(_.keys(reaction))];
      if(!_.isFunction(commandKey)) {
        addCommandList(reaction);
      }
      fs.writeFile(CommandPath, JSON.stringify(objectCombine(commandJSON,{commands: newJson})), res => resolve(`${JSON.stringify(reaction)}を覚えた`))
    } else {
      resolve();
    }
  })
}

function removeReaction(text) {
  const command = text.split(' ');
  const delCommand = command[1];
  return new Promise(resolve => {
    console.log(initialCommands)
    if(command[0] === "del" && initialCommands[delCommand]) {
      delete initialCommands[delCommand];
      var newJson = [initialCommands];
      removeCommandList(delCommand);
      fs.writeFile(CommandPath, JSON.stringify(objectCombine(commandJSON,{commands: newJson})), res => resolve(`${JSON.stringify(delCommand)}を忘れた`))
    } else {
      console.log('not found command')
      resolve('no');
    }
  })
}
//removeReaction('del gouhj').then(s => console.log(s))


function removeCommandList(key) {
  delete commands[key];
  console.log(commands)
}
function addCommandList(command) {
  const key = _.first(_.keys(command));
  commands[key] = createCommand(command[key]);
  console.log(commands)
}

function parseCommand(command, reaction) {
  if(_.isString(command) && _.isString(reaction)){
    return { [command]: reaction }
  } else {
    return null;
  }
}

function getUsers() {
  return list.users
}

function getCommands() {
  return initialCommands
}

module.exports = {registerReaction, removeReaction, addUserList, getUsers, getCommands};