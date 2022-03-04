import {get_gps_data} from '../gps-data.js'
import assert from 'assert'

Meteor.methods({
  /*
      we should not need this, if elevation start/end computed in the server.
      But processing the loop is done in the CLIENT => we need this.
  */

  'get-gps-data': (sid) =>{
    assert(sid, 'fatal@11 method')
    console.log(`requesting data for Control Point <${sid}>`)
    const retv = get_gps_data(sid)
    console.log(`requesting data for Control Point <${sid}>`,retv)
    return retv;
  },

  'loop-report': (loop) =>{
    const {stations} = loop;
    let z = loop.startz;
    stations.forEach((it,j) =>{
      z += it.mean;
      it.z = z;
      console.log(`${it.sid}  dh:${it.mean.toFixed(3)} ${z.toFixed(3)} ${it.elevation}`)
    })

    mk_tex(loop)
  }, // loop-report

  'get-test-xlsx': ()=>{
    const raw_xlsx = Assets.getBinary('211264.xlsx')
    console.log(`raw_xlsx.length`,raw_xlsx.length);
    loops = scan_xlsx_data(Buffer.from(raw_xlsx), {from_buffer:true})
    console.log(`loops@53`, loops)

    return loops
  }
})
