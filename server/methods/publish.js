import fs from 'fs'
import assert from 'assert'
import { exec, execSync } from "child_process";
const AWS = require('aws-sdk');

function get_s3cfg_accessKeys(fn) {
  retv = {}
  const lines = fs.readFileSync(fn,'utf8')
    .split('\n')
    .filter(line =>{
      if (line.startsWith('access_key')) return 1;
      if (line.startsWith('secret_key')) return 1;
      return 0;
    })
    .forEach(line =>{
      const v = line.split(' ');
      retv[v[0].trim()] = v[2].trim();
    })


  const {access_key:accessKeyId, secret_key:secretAccessKey} = retv;
  const retv2 = {accessKeyId, secretAccessKey};
  console.log(`get_s3cfg_accessKeys:`,{retv2})
  return retv2;
}

function get_accessKeys() {
  let env1 = process.env.METEOR_SETTINGS && JSON.parse(process.env.METEOR_SETTINGS)
  env1 = env1 || get_s3cfg_accessKeys('/home/dkz/.s3cfg-dkz');
  return env1;
}


/*
GitHUB.
*/
const {accessKeyId, secretAccessKey} = get_accessKeys();

const endpoint = 'https://us-east-1.linodeobjects.com';
const Bucket = 'cb-survey';

const verbose =0;

const s3 = new AWS.S3({
              accessKeyId,
              secretAccessKey,
              endpoint,
              s3ForcePathStyle: true, // needed with minio?
              signatureVersion: 'v4',
//              region:'default',
//              http_continue_timeout: 0 //# disable 'expect: 100-continue'
    });

console.log({s3})


async function s3put(fileName, o={}) {
  const {type, Key} = o;

  assert(Key, 's3put@10 Missing Key')

  /**
  // SEE:
  https://www.ibm.com/docs/en/aspera-on-cloud?topic=resources-aws-s3-content-types
  **/

  let ContentType;
  switch(type) {
    case 'pdf':
      ContentType = 'application/pdf';
    break;
    case 'xlsx':
      ContentType = 'application/vnd.ms-excel';
    break;
    default:
      ContentType = 'text/plain;charset=utf8';
  }


  const data = fs.readFileSync(fileName) // Buffer
  console.log(`data.length@22: ${data.length}`)
  const p = {
    Bucket,
    Key,
    ContentType,
    ACL: 'public-read',
    Body: data
  };
  const retv3 = await s3.putObject(p).promise().
  then(retv =>{
    console.log(`then@61 `,{retv})
    return retv
  })
  .catch(err =>{
    console.log(`s3.putObject@61 failed:`,{err})
  });
  ;(verbose >=0) && console.log(`s3put writing@34 <${Key}> ETag:<${retv3.ETag}>`)
  return retv3
}


Meteor.methods({
  'publish': async (loop) =>{
    /**
    // SHOULD BE ASYNC WITH PROMISE
    **/
    const {stations} = loop;
    /*
    let z = loop.startz;
    stations.forEach((it,j) =>{
      z += it.mean;
      it.z = z;
      console.log(`${it.sid}  dh:${it.mean.toFixed(3)} ${z.toFixed(3)} ${it.elevation}`)
    })
    */

    const tex_code = mk_tex(loop);
    const {project, loopNo=1, job} = loop;

    const fName = `elevation-report-${project.name}-${job.name}-${loopNo+1}`;
    fs.writeFileSync(`/home/dkz/${fName}.tex`, tex_code, 'utf8')

    const cmd = `pdftex  -output-dir=/home/dkz  /home/dkz/${fName}.tex`;

    try {
      const retv = execSync(cmd, {}).toString('utf8');
      console.log(`[${cmd}] => ${retv}`)
      const v = retv.split('Output written on')
      console.log({v})
      const v2 = v[1].trim().split(' ')
      console.log({v2})
      console.log(`Output:<${v2[0]}>`)

      if (false) {
        /**
        // Should do streaming here...
        **/
      } else {
        const retv = await s3put('/home/dkz/'+fName+'.pdf', {type:'pdf', Key: fName+'.pdf'})
        console.log(`s3put@101 =>`,retv)
        return {log:retv, pdfName:fName+'.pdf',
            url: `http://us-east-1.linodeobjects.com/cb-survey/${fName}.pdf`
          }
      }

    }
    catch(err) {
      console.log(`[${cmd}] => error`)
      console.log('FAILED',err)
      return ''

  //    console.log('FAILED',`[${err.err.id}]`,{err})
  //    return err.id
    }


  }
})


/**
//    this is export in TeX format
//    this file will import a style
**/

function mk_tex(loop) {
  const {stations,
    error, ae,
    project, loopNo,
    df_sum, db_sum, mean_sum, dist_sum, adj_sum,
    startp, report,
    job } = loop;

console.log({loop})

function fix_date(date) {
  return date.toString().replace(/\(.*\)/,'(Asia/Bangkok)')
}


  const _today = new Date();
//  const date = _today.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })
//  const date = _today.toString().replace(/\(.*\)/,'(Asia/Bangkok)')
  const date = fix_date(_today)

  const vtex = [`\\topskip10pt\\vsize=290mm\\voffset=-30pt
\\pdfpageheight 297mm
\\font\\TT = cmtt10 at 12pt
\\bgroup\\parskip=5pt
REPORT ELEVATION --- Project: ${project.name} {\\bf LOOP-${loopNo+1}}
\\par job origin: {\\TT ${job.name.toUpperCase()}}
\\par lastModified: ${fix_date(new Date(job.lastModified))}
\\par published: ${date}
\\par
\\egroup
\\dimen12=1.2pt
\\vskip10pt
\\halign{\\vrule width\\dimen12 \\vrule height11pt depth4pt width0pt
   \\kern5pt\\hfil#\\hfil\\kern5pt\\vrule    % sid
  &\\kern5pt\\hfil#\\kern2pt\\vrule   % fw
  &\\kern5pt\\hfil#\\kern2pt\\vrule   % bw
  &\\kern12pt\\hfil#\\kern2pt\\vrule   % mean
  &\\kern12pt\\hfil#\\kern2pt\\vrule   % distance
  &\\kern12pt\\hfil#\\kern2pt\\vrule   % Adj
  &\\kern12pt\\hfil#\\kern5pt\\vrule   % Elevation
  &\\kern2pt\\hfil#\\hfil\\kern2pt
  \\vrule width\\dimen12  % Remarks
  \\cr
\\noalign{\\hrule height0.0pt depth\\dimen12}
Station \\vrule height18pt depth10pt width0pt
& Forward
& Backward
& Mean\\kern4pt
&Distance
& Adj.\\kern14pt
&Elevation\\hfil
&\\kern25pt Remarks\\kern25pt
\\cr
\\noalign{\\hrule height0.0pt depth\\dimen12}
`];

vtex.push(`${startp.sid} &&&&&&${(+startp.gps_elevation).toFixed(3)} &${startp.sid}\\cr`)
//vtex.push(`\\noalign{\\hrule}`)

//vtex.push(`&${fw.toFixed(3)} &${bw.toFixed(3)} &${mean.toFixed(3)} &${dist.toFixed(3)} &${adj} &&\\cr`)


  for (it of stations) {
    console.log(it)
    if (!it.active) continue;

    // z : gps-elevation
    const {sid,df:fw,db:bw,mean,dist,adj,z,elevation,ae,rem='rem'} = it;

    vtex.push(`\\noalign{\\hrule}`)
    vtex.push(`&${fw.toFixed(3)} &${bw.toFixed(3)} &${mean.toFixed(3)} &${dist.toFixed(3)} &${-adj.toFixed(4)} &&\\cr`)

    vtex.push(`\\noalign{\\hrule}`)
//    vtex.push(`${sid} &&&&&&${elevation.toFixed(3)} &${sid}\\cr`)
    vtex.push(`${sid} &&&&&&${ae.toFixed(3)} &${sid}\\cr`) // adjusted elevation

  }

  vtex.push(`\\noalign{\\hrule height0pt depth\\dimen12}`)

  console.log({loop})

  vtex.push(`SUMMARY \\vrule width0pt height20pt depth10pt
    &${df_sum.toFixed(3)} &${db_sum.toFixed(3)} &${mean_sum.toFixed(3)} &${dist_sum.toFixed(3)} &${-adj_sum.toFixed(3)} &&\\cr`)
  vtex.push(`\\noalign{\\hrule height0.0pt depth\\dimen12}`)


  const last_row = stations[stations.length-1];
  console.log({last_row})

  vtex.push('}\n\\vskip30pt')

  /*
  vtex.push(`\\hbox to400pt{\\hfil gps-elevation at endpoint: ${last_row.gps_elevation.toFixed(3)}}`)
  vtex.push(`\\hbox to400pt{\\hfil computed elevation: ${last_row.elevation.toFixed(3)}}`)
  vtex.push(`\\hbox to400pt{\\hfil ${(last_row.gps_elevation-last_row.elevation).toFixed(3)}}`)
  vtex.push(`\\hbox to400pt{\\hfil Actual Error: ${error.toFixed(3)}}`)
  vtex.push(`\\hbox to400pt{\\hfil Allowable Error: ${ae.toFixed(3)}}`)
  */


  /*
  vtex.push(`\\par Class: 2`)
  qf \\sqrt{\\sum_{k=1}^{${stations.length}} dist_k \\over 1000}
  */

  vtex.push(`
  \\setbox102=\\vbox\\bgroup
  \\hsize=110pt
  $$0.012 \\sqrt{${dist_sum.toFixed(3)} \\over 1000} = ${ae.toFixed(3)}$$
  \\egroup\\ht102=30pt\\dp102=20pt
  `);



  vtex.push(`\\halign\\bgroup
    \\hfil# & =\\kern10pt #\\hfil\\cr`)

  vtex.push(`Error (FW\\&BW) & ${(Math.abs(db_sum) - Math.abs(df_sum)).toFixed(3)} mm\\cr`)
  vtex.push(`\\noalign{\\kern10pt}`)
  vtex.push(`Error (Closed loop) & ${mean_sum.toFixed(3)} mm\\cr`)

//  vtex.push(`Allowable Error & $0.012 \\sqrt{${dist_sum.toFixed(3)} \\over 1000}$\\cr`)
  vtex.push(`Allowable Error & \\hbox{\\box102}\\cr`)

  vtex.push(`& ${ae.toFixed(3)} mm\\cr`)


//  vtex.push(`FINAL & \\hbox{\\box102}\\cr`)


  vtex.push(`\\egroup`)




  vtex.push('\\end\\bye')

  return vtex.join('\n');
}
