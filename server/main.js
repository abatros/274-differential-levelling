import { Meteor } from 'meteor/meteor';

import get_control_points from './gps-data.js'
import './methods/gps-data.js'
import './methods/update-gps-data.js'
import './methods/publish.js'

//let control_points ={}; // sid => {x,y,z,sf}

Meteor.startup(() => {
  // code to run on server at startup
  if (false) {
    const {stations, bb} = get_control_points();
    stations.forEach(station => {
      const {sid,x,y,z,sf} = station
      control_points[sid] = {x,y,z,sf}
    })
  }
});
