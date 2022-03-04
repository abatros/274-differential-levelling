import assert from 'assert';

const raw_data =
`GPS-UTA-ST01	1400511.9120	717716.6202	4.6854	1.00019021
GPS-UTA-ST02	1400749.6076	717724.8055	5.7751	1.00019009
GPS-UTA-ST03	1402105.2786	717753.3793	11.0396	1.00018941
GPS-UTA-ST04	1402407.7953	717775.5625	11.9937	1.00018938
GPS-UTA-ST05	1403072.7353	717826.9474	13.9914	1.00018935
GPS-UTA-ST06	1403193.3951	717835.3713	14.4990	1.00018931
GPS-UTA-ST07	1404185.8109	717908.7859	17.4121	1.00018925
GPS-UTA-ST08	1404312.2381	717912.0200	17.8749	1.00018920
GPS-UTA-ST09	1404790.2963	717672.5687	18.9837	1.00018773
GPS-UTA-ST10	1404889.8310	717897.9109	19.3373	1.00018889
GPS-UTA-ST11	1405209.2824	718620.8724	29.2921	1.00019123
GPS-UTA-ST12	1405290.7109	718812.4091	28.0117	1.00019247
GPS-UTA-ST13	1405576.3600	719445.6875	39.3708	1.00019411
GPS-UTA-ST14	1405660.5380	719632.3713	44.4200	1.00019433
GPS-UTA-ST15	1405789.0262	719934.6090	49.0197	1.00019525
GPS-UTA-ST16	1405906.3688	720122.7484	54.0623	1.00019548
GPS-UTA-ST17	1404886.7427	720288.7380	28.9858	1.00020032
GPS-UTA-ST18	1404696.8821	720328.0750	26.3130	1.00020096
GPS-UTA-ST19	1404261.8501	720435.4411	21.5772	1.00020229
GPS-UTA-ST20	1404133.3704	720473.7735	20.5508	1.00020266
GPS-UTA-ST21	1403149.1253	720628.6210	19.9670	1.00020359
GPS-UTA-ST22	1403005.3617	720626.9789	18.9482	1.00020374
GPS-UTA-ST23	1401708.8298	720652.4740	5.8179	1.00020595
GPS-UTA-ST24	1401523.0403	720640.1992	6.4910	1.00020577
GPS-UTA-ST25	1401678.5983	719554.0458	12.1312	1.00019898
GPS-UTA-ST26	1401455.7742	719569.4265	13.4306	1.00019885
GPS-UTA-ST27	1401371.5775	718739.3761	7.4261	1.00019530
GPS-UTA-ST28	1401328.1799	718474.3828	7.7521	1.00019382
GPS-UTA-ST29	1402040.1640	718413.3679	9.3654	1.00019324
GPS-UTA-ST30	1402194.5032	718530.0282	9.9676	1.00019377
GPS-UTA-ST31	1402171.6299	719477.3873	9.9907	1.00019890
GPS-UTA-ST32	1402182.4511	719645.5211	12.4511	1.00019942
GPS-UTA-ST33	1402755.9053	719913.7491	18.0490	1.00019979
GPS-UTA-ST34	1402780.6011	719661.1352	12.8011	1.00019945
GPS-UTA-ST35	1402841.8966	718820.0041	12.6381	1.00019492
GPS-UTA-ST36	1402863.3860	718497.6546	12.9668	1.00019313
GPS-UTA-ST37	1404201.7458	718883.4797	30.2371	1.00019250
GPS-UTA-ST38	1404268.3626	718702.2750	32.0687	1.00019123
GPS-UTA-ST39	1404644.5279	719382.5787	27.2005	1.00019568
GPS-UTA-ST40	1404785.9802	719384.0104	26.5587	1.00019579
GPS-UTA-THR18	1404315.3000	717867.6770	18.6180	1.00018884
GPS-UTA-THR36	1400814.2250	717610.8790	8.1030	1.00018911
BM1117	1400814.2250	717610.8790	2.501	  1.00018911`; // fake xy

const control_points =[];

function init() {
  let stations = raw_data.split('\n').map(it=>{
      const [sid,y,x,z,sf] = it.split(/\s+/g);
      control_points[sid] = {x,y,z,sf}
      return {sid,y,x,z,sf}
    })

  // BoundingBox what for ?

  const bb ={
    xMin: +stations[0].x,
    xMax: +stations[0].x,
    yMin: +stations[0].y,
    yMax: +stations[0].y,
  }

  for (let i=1; i<stations.length; i++) {
    const s = stations[i]
    if (s.x < bb.xMin) bb.xMin = +s.x;
    if (s.x > bb.xMax) bb.xMax = +s.x;
    if (bb.yMin > s.y) bb.yMin = +s.y;
    if (bb.yMax < s.y) bb.yMax = +s.y;
//    console.log(s,bb)
  }

  console.log({stations},{bb})
  return {stations,bb}
}


init();

//export default init;

export function update_gps_data(sid, elevation) {
  const retv = get_gps_data(sid);
  if (retv.error) {
    // not found
    sid = sid.toUpperCase();
    control_points[sid] = {sid,z:elevation}
    return control_points[sid];
  }

  // already exists

  sid = retv.sid;
  Object.assign(control_points[sid], {z:elevation})
  return control_points[sid];
}


export function get_gps_data(sid) {
  assert(sid, 'fatal@98')
  const _sid = sid; // original
  sid = sid.toUpperCase();
  console.log(`get_gps_data(${sid}) nstations:${Object.keys(control_points).length}`)
  const cp1 = control_points[sid];
  if (cp1) {
    return Object.assign(cp1, {sid});
  }

  sid = 'GPS-UTA-'+sid;
  const cp2 = control_points[sid];
  if (cp2) {
    return Object.assign(cp2, {sid});
  }

  return {
    error: 'not-found',
    sid: _sid
  }
}
