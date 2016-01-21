var request = require("superagent");
const _ = require("lodash");
var url = "http://ax.itunes.apple.com/WebObjects/MZStoreServices.woa/wa/wsSearch";


function searchMucic(name, callback) {
  request
    .get(url)
    .query({
      term: name,
      country: "JP",
      entry: "musicTrack",
      limit: 5
    })
    .end((err, res)=> {
      const result = JSON.parse(res.text);
      if (result.resultCount > 0) {
        const track = _.first(result.results);
        callback(`${track.trackName} ${track.artistName} ${track.previewUrl}`)
      } else {
        callback("no match");
      }
    })
}

function searchMusicPromise(name) {
  return new Promise(resolve => {
    request
      .get(url)
      .query({
        term: name,
        country: 'JP',
        entry: 'musicTrack'
      }).end((err, res) => {
        const result = JSON.parse(res.text);
        if (result.resultCount > 0) {
          const track = _.first(result.results);
          resolve(track)
        } else {
          resolve("no match");
        }
      })
  })
}

function trackParse(track) {
  return `${track.trackName} ${track.artistName} ${track.previewUrl}`
}

function itunesTrack(text) {
  const command = text.split(' ');
  return new Promise(resolve => {
    if (command[0] === "it") {
      searchMusicPromise(command[1]).then(res => {
        resolve(trackParse(res));
      })
    } else {
      resolve();
    }
  })
}


module.exports = {searchMucic, searchMusicPromise, itunesTrack};