const _ = require('lodash');
const Rx = require('rx');
const Promise = require('promise');
const objectCombine = require('./utils.js').objectCombine;
const dbConnect$ = new Rx.Subject();
const twitStore = require('./twitbot.js');
const getUsers = twitStore.getUsers;
const getCommands = twitStore.getCommands;
const registerReaction = twitStore.registerReaction;
const removeReaction = twitStore.removeReaction;
const registerWhiteList = twitStore.addUserList;
const commands = {
  '/reactions':getReaction,
  '/users': getWhiteList,
  '/users/create': addUserList,
  '/reactions/create': addCommand,
  '/reactions/delete': removeCommand
};
const queryFactory = setQueryFactory(commands);
const dbResponse$ = dbConnect$.flatMap(d => Rx.Observable.fromPromise(dbConnectPromise(queryFactory(d))));
dbResponse$.subscribe(s => {
  console.log(s)
  s.res(s.results)
});

function dbConnectPromise(promise) {
  return new Promise(resolve => {
    promise.then(data => {
      if(!_.isEmpty(data.store)) {
        data.results = data.store;
        resolve(data)
      } else {
        resolve(data)
      }
    })
  })
}
function setQueryFactory(commands) {
  return (data) => {
    const method = data.url;
    return new Promise(resolve => {
      if (_.isFunction(commands[method])) {
        const promise = commands[method](data);
        promise.then(res => {
          resolve(objectCombine(data, res));
        })
      } else {
        resolve(data);
      }
    })
  }
}

function addUserList(data) {
  const name = data.body.name;
  return new Promise(resolve => {
    registerWhiteList(name)
    resolve({store: name})
  })
}

function addCommand(data) {
  const command = data.body.command;
  const reaction = data.body.reaction;
  return new Promise(resolve => {
    registerReaction(`reg ${command} ${reaction}`);
    resolve({store: {command, reaction}})
  })
}

function removeCommand(data) {
  const command = data.body.command;
  return new Promise(resolve => {
    removeReaction(`del ${command}`);
    resolve({store: {command}})
  })
}

function getReaction() {
  return new Promise(resolve => {
    resolve({ store: getCommands()})
  })
}

function getWhiteList() {
  return new Promise(resolve => {
    resolve({ store: getUsers()})
  })
}



//dbConnectPromise(queryFactory({body:{checkInId: 1},url: "/checkout"})).then(console.log)
//dbConnectPromise(queryFactory({body:{key: 1},url: "/checkIn/new"})).then(console.log);
//dbConnectPromise(queryFactory({body:{userId: 2},url: "/user/checkIn/last"})).then(console.log);
//dbConnectPromise(queryFactory({body:{key: 1,name: "suzukisan"},url: "/user/create"})).then(s => {
//  console.log(s)
//});


module.exports = {dbConnect$, dbConnectPromise};