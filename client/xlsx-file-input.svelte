<script>
const verbose =1;
let input_files;
let input; // dom element
let message1 ='';
//import {process_loops} from './process-loops.js'
import {process_loops} from './process-loops.js'
import {process_xlsx_file, reset_loop} from './process-loops.js'
import {refresh_loop} from './refresh-loop.js'
export let loops;

$: {
  if (input_files && input_files.length >0) {
    ;(verbose) && console.log(`input_files ${input_files.length} loaded@102`, input_files)
    //autorun(input_files[0])

    message1 = 'processing file, please wait...'
    loops = [];


    const retv = process_xlsx_file(input_files[0])
    .then(async (retv)=>{
      ;(verbose) && console.log(`autorun@13:`,{retv})
      const {loops:loops_} = retv;
  //    loops = retv.loops;
      switch (loops_.length) {
        case 0: message1 = `unable to find any loops.`; break;
        case 1: message1 = `found 1 loop and ${loops_[0].stations.length} stations`; break;
        default:
          message1 = `found ${loops_.length} loops`
      }

      /*
      loops_.forEach(loop =>{
        get_loop_gps_data(loop)
      }) */

      for (const loop of loops_) {
        /*
        reset_loop(loop)
        await get_loop_gps_data(loop)
        // that does a job of creating row1
        */
        await refresh_loop(loop, {fetch_gps:true})
      }

      loops = loops_
//      $loops = [...loops_]
    })
  }
}

/*
function autorun (input_file) {
  console.log(`@33 File:`,input_file)
  //      for (let i=0; i<input_files.length; i++) {console.log(`@33`,input_files[i])}

  const reader = new FileReader()
  //    reader.readAsDataURL(input_files[0]);
  reader.onload = process_loops;
  reader.readAsArrayBuffer(input_files[0]) // => autorun
} // read xlsx
*/

</script>


<vbox class="ql"
    style="
    border:0px solid blue;
    padding:10pt 10pt 0 30px;">
  <input style="font-size:1em;"
    bind:files={input_files}
    bind:this={input}
  type="file" name="" value="" placeholder="select XLSX file">
  <p>{message1}</p>
</vbox>
