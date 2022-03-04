import {get_gps_data, update_gps_data} from '../gps-data.js'


Meteor.methods({
  /*
      we should not need this, if elevation start/end computed in the server.
      But processing the loop is done in the CLIENT => we need this.
  */

  'update-gps-data': (o={}) =>{
    const {sid, elevation, gps_elevation} = o;
    const e = elevation || gps_elevation
    const retv = update_gps_data(sid,e)
    console.log(`updating data for Control Point <${sid}>`,retv)
    return retv;
  },

})
