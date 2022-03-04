import assert from 'assert'
import XLSX from 'xlsx';

const verbose =0;

function xlsx2json(xlsx_fn, o={}) {
  const {from_buffer, verbose=0} = o;
  const options_a = {
    cellDates:false
  }

  let workbook;
  if (!from_buffer) {
    workbook = XLSX.readFile(xlsx_fn, options_a);
  } else {
    workbook = XLSX.read(xlsx_fn);
  }
  const sheet1 = workbook.SheetNames[0];
  ;(verbose) && console.log({sheet1})
  const options = {
    header: ['sid','bs_ht','C','fs_ht','dh','mean_dh','elevation','bs_dist','H','fs_dist']
  }

  const raw_data = XLSX.utils.sheet_to_json(workbook.Sheets[sheet1],options);
  ;(verbose>=1) && console.log({raw_data})

//  console.log({rows})

 /**
 // FIRST : IDENTIFY THE LOOP
 **/
  const loops_ = make_loops(raw_data);
//  console.log({loops_})

  const loops = loops_.map(loop =>{
    return reduce_loop(loop) // this has single line for each segment
  })

  return loops;
}


export  function make_loops(xlsx, o={}) {
  const {verbose} = o;
  /**
  // first pass is to identify loops.
  // lines with fs_dist empty are ignored
  // a loop ends with fs_dist NaN
  // a loop starts with fs_dist as a valid number.
  **/

  ;(verbose >=1) && console.log(`make-loops@52 xlsx.length:${xlsx.length}`)

  let loops = [];
  let loop = [];

  function end_loop() {
    if (loop.length >0) {
      loops.push(loop);
      // loop.length = 0;
      loop = [];
    }
  }

  for (row of xlsx) {

    row.sid = ''+row.sid; // to avoid making integer
    row.fs_dist = +row.fs_dist
    row.bs_dist = +row.bs_dist
    row.fs_ht = +row.fs_ht
    row.bs_ht = +row.bs_ht

    if (!row.sid) {
      throw 'break@72'
      end_loop();
      continue;
    }

    if (!row.fs_dist) {
      /**
      // line to ignore
      // two cases:
      //      line with mean elevation : ignore
      //      else : end_loop
      **/
      ;(verbose>=1) && console.log(`ignore-row@82:`,row)
      if (!isNaN(row.mean_dh)) {
        // found a number => just skip
        // coumd be done by i+=3
        continue;
      }
      end_loop(); // important
      continue; // stay in same loop
    }


    if (isNaN(row.fs_dist)) {
      // headline: restart a loop
      end_loop();
      ;(verbose>=1) && console.log(`end-loop@89:`,row)
      continue
    }


    // contribute...
    loop.push(row)
    ;(verbose>=1) && console.log(`contribute to loop[${loops.length}] @82`,row)
  } // each line in raw_data

  /**
  // DO NOT FORGET THE LAST LOOP
  **/
  if (loop.length>0) loops.push(loop)

  ;(verbose) && console.log({loops})
  return loops;
}


export function get_gps_data(sid) {
  assert(sid, 'fatal@121')
  return new Promise((resolve,reject)=>{
    Meteor.call(`get-gps-data`, sid, (err,data)=>{
      if (err) reject(err)
      console.log(`get-gps-data@124 => `,data)
      resolve(data); // {x,y,z,sid}
    })
  })
}


export async function get_loop_gps_data(loop) {
  throw 'obsolete@133'
//  loop.row1 = loop.row1 || {sid:loop.sid1, elevation:undefined, gps_elevation:undefined}

  assert(loop.startp, 'Missing loop.startp@114')
  assert(loop.endp, 'Missing loop.endp@115')

  const startp = loop.startp;
  const endp = loop.endp;

  /*
  const station1 = loop.startp;
  const ns = loop.stations.length;
  const endp = loop.stations[ns-1];
  endp.elev = undefined
  */

  console.log(`get_loop_gps_data@145 first_sid: ${startp.sid}`)
  console.log(`get_loop_gps_data@146 last_sid: ${endp.sid}`)

  startp.elevation = startp.gps_elevation = undefined;

  const p1 = get_gps_data(startp.sid)
    .then(data=>{
      if (data.error) {
        startp.gps_elevation =undefined;
      } else {
        startp.gps_elevation = +data.z;
      }
      console.log(`gps1 startp:`,startp)
    })

  const p2 = get_gps_data(endp.sid)
  .then(data=>{
    if (data.error) {
      endp.gps_elevation =undefined;
    } else {
      endp.gps_elevation = +data.z;
      console.log(`endp elevation:${endp.elevation} gps:${endp.gps_elevation}`)
    }
  })

  // we might not need this
  await Promise.all([p1,p2])
  console.log('await Promise.all([p1,p2])',{startp})
  console.log('await Promise.all([p1,p2])',{endp})

  if (!startp.gps_elevation) {
    // reset all elevation
    loop.stations.forEach((row,j) =>{
      row.elevation = undefined
    })
    return; // should clean results before
  }

  let elevation = +startp.gps_elevation;

  for (row of loop.stations) {
    if (!row.active) continue;
    assert(!isNaN(row.mean), `isNaN(${row.mean})`)
    elevation += row.mean;
    row.elevation = elevation
    assert(!isNaN(row.elevation), `isNan(${row.elevation})`)
  }

  do_the_math(loop) // add report
//  loop.endp = loop.stations[loop.stations.length -1]
}

// ------------------------------------------------------------------------

export async function recompute_loop(loop) {
  throw 'obsolete@203'
  reset_loop(loop)
  console.log('recompute...',{loop})
  sum_columns(loop)

  await get_loop_gps_data(loop);

  loop.stations.forEach((it,j) =>{

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
  })

  return loop; // really ?
}


export function reset_loop(loop) {

    assert(loop.startp, 'Missing loop.startp@191')
    assert(loop.endp, 'Missing loop.endp@192')

  loop.startp.elevation = loop.startp.gps_elevation = undefined
  loop.endp.elevation = loop.endp.gps_elevation = undefined

  loop.stations.forEach(s =>{
    s.elevation = undefined
  })

  /*
  still Ok.
  loop.df_sum = undefined
  loop.db_sum = undefined
  loop.mean_sum = undefined
  loop.dist_sum = undefined
  */

  loop.report ={}

  loop.error = undefined
  loop.ae = undefined
}


// ========================================================================


export function do_the_math(loop) {
  /**
  //
  **/

  console.log('Computing SUMMARY',{loop})
  const {stations, mean_sum, dist_sum, df_sum, db_sum, startp, endp} = loop;

  /*
  const ns = stations.length;
  let fix0 = station1.gps_elevation;
  let fix1 = stations[ns-1].gps_elevation
  console.log(`dif:${fix1-fix0}`)
  */

  if (!endp.gps_elevation) return;
  if (!startp.gps_elevation) return;

  assert(loop.endp.gps_elevation, 'endp.gps_elevation missing@231')
  assert(loop.startp.gps_elevation, 'startp.gps_elevation missing@232')


  const quality = 0.008;
  const qf = [0.003, 0.008, 0.012];

/*
  let elevation = +fix0;
  stations.forEach(it =>{
    elevation += it.mean;
//    it.z = elevation
    it.elevation = elevation
  })*/


  // console.log(`stations@381`,{stations})

  const error=mean_sum-(loop.endp.gps_elevation-loop.startp.gps_elevation)
// allowable error
  const ae = quality*Math.sqrt(dist_sum/1000)
  console.log(`-----------
    Summary
    df:${df_sum} db:${db_sum} mean:${mean_sum} dist:${dist_sum}
    ${loop.endp.gps_elevation-loop.startp.gps_elevation} ERROR:${error} << ae:${ae}`)

  const ns = loop.stations.length;
  const ch=(error-0.0050)/ns
  console.log(`ch:${ch} x${ns}=${ch*ns}`)

  Object.assign(loop, {error,ae,fw_sum:df_sum,bw_sum:db_sum,mean_sum,dist_sum})

  loop.report = {ae, error}
  loop.project = {name: 'test-lekky'}
  console.log(`loop@399`,{loop})
return ch;



  return ch;
}

// ========================================================================


function reduce_loop(loop, o={}) {
  /**
  // compute mean and sum.
  // df db
  // divide nlines by two
  **/

  const {verbose=0} = o;

  console.log(`processing a loop with ${loop.length} rows`)
  if (loop.length%2 >0) {
    const error = `fatal-error in input data: odd number of lines: ${loop.length}`
    console.log(error)
    return {
      error
    }
  }
  const final=[]

  for (let k=0; k<loop.length; k+=2) {
    ;(verbose >=2) && console.log(`line[${0+k}]`, loop[0+k])
    ;(verbose >=2) && console.log(`line[${1+k}]`, loop[1+k])

    /**
    // ab fs
    // vb bs
    **/

    const sid = loop[1+k].sid.trim(); // B: A->B
    const df = loop[0+k].bs_ht - loop[0+k].fs_ht
//    console.log(`${loop[0+k].fs_ht} - ${loop[0+k].bs_ht} = ${df}`)
    const db = loop[1+k].fs_ht - loop[1+k].bs_ht
    const mean = (df-db)/2
    const dist = loop[0+k].fs_dist + loop[0+k].bs_dist;

    //console.log(`==> df:${df} db:${db} mean:${mean} dist:${dist}`)
    final.push({sid,df,db,mean,dist,active:true})
  }

 //console.log({final})

  let df_sum = 0
  let db_sum = 0
  let mean_sum = 0
  let dist_sum = 0

  const retv = {
    stations:final,
    df_sum, db_sum, mean_sum, dist_sum,
    startp: {sid:loop[0].sid.trim(), elevation:+loop[0].elevation},
    endp: final[final.length-1]
  }

  //console.log({retv})
  return retv;
}


function sum_columns(loop) {
  const {stations} = loop;
  let df_sum = 0
  let db_sum = 0
  let mean_sum = 0
  let dist_sum = 0
  let ns_active = 0;

  for (it of stations) {
    if (!it.active) continue;
    df_sum += it.df
    db_sum += it.db
    mean_sum += it.mean;
    dist_sum += it.dist;
    ns_active +=1;
  }

  Object.assign(loop, {df_sum, db_sum, mean_sum, dist_sum, ns_active})
  return loop;
}

// ========================================================================

const quality = 0.008;

function summary(final, fix0=12.974, fix1=18.049) {


    const error=mean_sum-(fix1-fix0)
    const ae = quality*Math.sqrt(dist_sum/1000)
    console.log(`-----------
      Summary
      df:${df_sum} db:${db_sum} mean:${mean_sum} dist:${dist_sum}
      ${fix1-fix0} ERROR:${error} << ae:${ae}`)

    const ch=(error-0.0050)/final.length
    console.log(`ch:${ch} ${ch*16}`)

    return ch;
} // summary



export function process_loops(e, o={}) {
  const {verbose} = o;
  //        avatar = e.target.result
  const file = e.target; // bind to input_file
  // WRONG user getter ....const {name:jobName, lastModified} = file;
  //console.log(`this:`,this)
  ;(verbose) && console.log(`e.target.result@64 jobName:${this.jobName}`,e.target,{file})
  ;(verbose) && console.log(`e.target.result@65`,e.target.result)
  const loops = xlsx2json(e.target.result)
  ;(verbose) && console.log(`processing done found ${loops.length} loops.`,{loops})

  loops.forEach((loop,loopNo) =>{
    ;(verbose) && console.log({loop})
    loop.loopNo = loopNo;
    loop.project = {name:'UTA-344.21'};
    loop.job = {name: this.jobName, lastModified: this.lastModified};

    sum_columns(loop)

    for (row of loop.stations) {
      const {df,db,mean,dist,active} = row;

      if (!active) continue;

      ;(verbose>=1) && console.log(`process_loop`,row)
      row.df_ = row.df.toFixed(3);
      row.db_ = row.db.toFixed(3);
      row.mean_ = row.mean.toFixed(3);
      row.dist_ = row.dist.toFixed(3);
      row.sid = row.sid.trim();
      row.elevation = '';
      row.controlp = false; // not a controlp
    }
  })


  ;(verbose) && console.log(`loops@85`, loops)

    //    data_ready = true;
  err_List = loops.filter(loop=>(loop.error))
  message1 = `done : found ${loops.length} loops with ${err_List.length} errors`;
        //table_ready = true;

//        console.log(`@45 FileList:`,input_files)
//        for (let i=0; i<input_files.length; i++) {console.log(`@45`,input_files[i])}
//        input_files = null;
//        input.value = ''
  if ((!err_List || err_List.length <=0) && loops.length>0) {
    state = 'q3'
  }

  this.cb({loops})

} // process_loops



export function process_xlsx_file (input_file) {
  ;(verbose) && console.log(`@33>>> jobName:${input_file.name} File:`,input_file)
  //      for (let i=0; i<input_files.length; i++) {console.log(`@33`,input_files[i])}

  const reader = new FileReader()
  //    reader.readAsDataURL(input_files[0]);
  const {name:jobName, lastModified} = input_file;
  //const p2 = process_loops.bind({jobName:input_file.name});

  return new Promise((resolve,reject)=>{
    function cb(data) {
      ;(verbose) && console.log(`callback data:`,data)
      resolve(data)
    }
    reader.onload = process_loops.bind({jobName, lastModified, cb});
    reader.readAsArrayBuffer(input_file) // => autorun
  })

} // read xlsx
