import assert from 'assert'
const verbose =0;

function validate_fw_bw(it) {

  /**
  // should be opposite sign
  // difference between reading should be less 3mm
  // because bs_ht opposite sign fs_ht
  //  we should not have
  **/
  ;(verbose>=2) && console.log(`station[${j}]:`,it)
  if ((it.db <0) && (it.df <0)) {
  //      console.log(`flag_error bs:${it.bs_ht} fs:${it.fs_ht}`)
    it.flag_error = 1;
  }
  else
  if ((it.db >0) && (it.df >0)) {
    //    console.log(`flag_error bs:${it.bs_ht} fs:${it.fs_ht}`)
    it.flag_error = 2;
  }
  else {
    let e = it.db + it.df; // because opposite sign
    //    if (e<0) e = -1;
    it.flag_error = ((e > 0.003)||(e < -0.003))?3:0;
  }
  ;(verbose>=2) && console.log(`flag_error@227 ${it.flag_error} bs:${it.db} fs:${it.df}`)
}


export function get_gps_data(sid) {
  assert(sid, 'fatal@121')
  return new Promise((resolve,reject)=>{
    Meteor.call(`get-gps-data`, sid, (err,data)=>{
      if (err) reject(err)
      console.log(`get-gps-data@124 => `,data)
      resolve(data); // {x,y,z,sid}
    })
  }) // Promise
}


export async function refresh_loop(loop, o={}) {
  const {fetch_gps} = o;
  console.log(`refresh_loop ${(fetch_gps)?'with FETCH-GPS':''}`,loop)
  /*
  // PHASE 1
  */

  const {stations} = loop; // its not really stations...
  let df_sum = 0
  let db_sum = 0
  let mean_sum = 0
  let dist_sum = 0
  let ns_active = 0;

  for (it of stations) {
    if (!it.active) continue;

    assert(!isNaN(it.mean), `isNaN(${it.mean})`)

    df_sum += it.df
    db_sum += it.db
    mean_sum += it.mean;
    dist_sum += it.dist;
    ns_active +=1;
    validate_fw_bw(it)
    it.elevation = undefined; // global reset
  }

  Object.assign(loop, {df_sum, db_sum, mean_sum, dist_sum, ns_active})

  /**
  // PHASE TWO CHECK ENDP
  **/

  assert(loop.startp, 'fatal@31')
  assert(loop.endp, 'fatal@32')
  const startp = loop.startp;
  const endp = loop.endp;

  if (fetch_gps) {
    /**
    // Another chance to recheck
    **/

    if (!startp.gps_elevation) {
      const retv = await get_gps_data(startp.sid);
      if (!retv.error) {
        startp.elevation = startp.gps_elevation = +retv.z
        startp.sid = retv.sid
      }
    }

    if (!endp.gps_elevation) {
      const retv = await get_gps_data(endp.sid);
      if (!retv.error) {
        endp.gps_elevation = +retv.z
        endp.sid = retv.sid
      }
    }
  }



  if (startp.gps_elevation == undefined) {
    /**
    // NOTING TO DO
    **/
    return;
  }

  assert(!isNaN(startp.gps_elevation), 'fatal@70')

  let elevation = startp.elevation = startp.gps_elevation;
  for (it of stations) {
    if (!it.active) continue;
    elevation += it.mean;
    it.elevation = elevation
//    it.elevation = undefined;
  }

  if (endp.gps_elevation == undefined) {
    /**
    // STOP HERE no error computation possible
    **/
    return;
  }


  const quality = 0.008;
  const qf = [0.003, 0.008, 0.012];

  const error=mean_sum-(endp.gps_elevation-startp.gps_elevation)
  // allowable error
  const ae = quality*Math.sqrt(dist_sum/1000)

  Object.assign(loop,{error,ae})
  return loop;
}
