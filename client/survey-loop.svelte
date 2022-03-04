<script>
import assert from 'assert'
import {onMount} from 'svelte'
import {setContext} from 'svelte'
import {get_gps_data} from './process-loops.js';
import {refresh_loop} from './refresh-loop.js';

// import ModalContent from './ModalContent.svelte';
import Modal2 from './Modal2.svelte';
let isOpenModal = false;
let endp_Modal = undefined; // could be used as isOpenModal

function trap_nan(x,m) {assert(!isNaN(x),m)}

function openModal2() {
	console.log(`openModal2 this:`,this) // ise this one
	console.log(`openModal2`,{endp}) // NOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO
	const endp_ = this.endp;
	if (isNaN(endp_.gps_elevation)) endp_.gps_elevation=undefined;
  isOpenModal = true;
	endp_Modal = endp_;
 }

 function closeModal2() {
	 console.log('closeModal2',{endp_Modal})
   isOpenModal = false;
	 // DONE IN Modal2
//	 update_gps_data(endp_Modal)
 //		recompute();
 }

import { writable } from 'svelte/store';
import Modal, { bind } from './modal.js';
//import Popup from './Popup.svelte';
const modal = writable(null);


const showModal = (endp) => {
	console.log(`showModal@15`,{endp})
	// here we can choose which modal to display.
	//setContext('endp',endp)
	modal.set(bind(Popup, { message: 'Surprise', endp, modal,
		onClose:applyGPS
	}));
}

function applyGPS(endp){
	console.log('closingModal@24 endp:',endp)
	update_gps_data(endp)
//	recompute();
	modal.set(null)
}


//import Modal,{getModal} from './Modal.svelte'
let selection;

let name; // set a name to show a Modal.
let status = 0;

const onCancel = (text) => {
	name = '';
	status = -1;
}

const onOkay = (text) => {
	name = text;
	status = 1;
}



export let loop;
const verbose =0;
assert (loop.startp, 'corrupted loop.startp')
assert (loop.endp, 'missing loop.endp')

/*
// to make them reactive
*/
let startp = loop.startp;
let endp = loop.endp;

let recompute_flag = false; // set recompute button to red


/*
$: {
	startp = loop.startp;
	endp = loop.endp;
//  const l = loop;  Just look at startp, endp
  console.log(`startp.sid:${startp.sid} gps-elevation:${startp.gps_elevation} ${startp.elevation}`,)
  console.log(`endp.sid:${endp.sid} gps-elevation:${endp.gps_elevation} ${endp.elevation}`)
//  recompute_flag = true;
}*/


$: autorun62(loop);

function autorun62() {
	loop.startp.elevation = +loop.startp.elevation;
	loop.endp.elevation = +loop.endp.elevation;
	loop.startp.gps_elevation = +loop.startp.gps_elevation;
	loop.endp.gps_elevation = +loop.endp.gps_elevation;
	assert(!isNaN(loop.startp.elevation), 'fatal@101')
	assert(!isNaN(loop.endp.elevation), 'fatal@102')
	assert(!isNaN(loop.startp.gps_elevation), 'fatal@107')
	assert(!isNaN(loop.endp.gps_elevation), 'fatal@108')
	console.log(`**************** autorun@62 every loop change`,loop)
//	loop = loop;
	startp = loop.startp;
	endp = loop.endp;
	assert(!isNaN(startp.elevation), 'fatal@103')
	assert(!isNaN(endp.elevation), 'fatal@104')

	mk_Adjustment(loop);
}

// -------------------------------------------------------------------------

function mk_Adjustment(loop) {
	const error = loop.endp.elevation - loop.endp.gps_elevation;
	console.log(`mk_Adjustment error:${error}`)
	assert(error == loop.error,'fatal@123')

	let D =0;
	loop.stations.forEach(it =>{
		D += it.dist;
	})

	console.log(`mk_Adjustment total-dist:${D}`)

	let error_toGo = error;
	let dist_toGo = D;
	let adj_sum = 0;

	loop.stations.forEach((it,j) =>{
		it.di = (error_toGo * it.dist)/dist_toGo
		adj_sum += it.di
		it.adj = it.di;
		it.ae = it.elevation - adj_sum; // adjusted elevation

		console.log(`-- ${j} delta:${it.di.toFixed(5)} h:${it.elevation.toFixed(5)} => adj:${it.adj.toFixed(5)} `)
		error_toGo -= it.di
		dist_toGo -= it.dist
	})

	Object.assign(loop, {adj_sum})
}


// -------------------------------------------------------------------------


let busy_publishing = false;
let busy_message = {color:'white', message:''}

function publish() {
//  const retv = await publish_loop(loop)
  busy_publishing = true;
	busy_message = {color:'green', message:'publishing - please wait...'}

	loop.stations.forEach(it =>{
		trap_nan(it.adj, 'fatal@160')
	})


  Meteor.call('publish',loop,(err,data)=>{
    if (err) {
      message1 = `failed to send loop-report (system-error)`
      busy_message = {color:'red',
        message: `failed to publish (system-error)`
      }
      return;
    }
    const {pdfName, url} = data;
//    const url = `http://lekkyweb.com/${loop.job.name}`;
//    const url = `http://lekkyweb.com/${pdfName}`;
    busy_message = {color:'green',
      message: `visit &rarr;&emsp;<a href="${url}" target="_blank">${url}</a>`
    }
    console.log('PUBLISHED:',data)
    message1 = `loop-report sent successfully to server`
  })
}


;(verbose) && console.log(`before onMount@12`,{loop})


  let loopNo = 0;
//let row1 = {sid: loop.sid1}
//  let last_row = loop.stations[loop.stations.length-1]

  let report = loop.report;


onMount(()=>{
  ;(verbose) && console.log(`onMount@11`,{loop})
//  startp_tr = loop.startp.tr;
  recompute_flag = false;
})

/*
$: {
  console.log(`startp_tr@64:`, loop_startp_tr)
  console.log(`startp_sid@64:`, loop_startp_sid)
}
*/

async function refresh_loop_(o={}) {
	trap_nan(loop.endp.gps_elevation, `fatal@167:${loop.endp.gps_elevation}`)
	await refresh_loop(loop,o);
	trap_nan(loop.endp.gps_elevation, `fatal@169:${loop.endp.gps_elevation}`)
	trap_nan(loop.endp.gps_elevation, `fatal@171:${loop.endp.gps_elevation}`)
	startp = loop.startp;
	endp = loop.endp;
	trap_nan(endp.gps_elevation, `fatal@171:${endp.gps_elevation}`)
	loop = loop;
}


//let startp_state = ''
async function every_sid_change() {
	/**
	// this gets data from binding {endp:loop.startp}
	//	or {endp:loop.endp}
	**/
//	loop.startp.gps_elevation = undefined;
//	console.log(`every_sid_change gps:`,loop.startp.gps_elevation)
//	console.log(`every_sid_change this:`,this)
//	console.log(`every_sid_change endp:`,endp)
	const endp_ = this.endp
	console.log(`EVERY_SID_CHANGE`,{endp_})

	switch(endp_) {
		case startp : {
				console.log(`onChange startp sid:${startp.sid}`,{startp});
//				startp.gps_elevation = 99.991;
				assert(startp.sid, 'fatal@189')
				const {sid,z,error} = await get_gps_data(startp.sid)
				if (error) break;

				startp.sid = sid;
				startp.gps_elevation = +z;
				assert(startp.gps_elevation == endp_.gps_elevation, 'fatal@192')
				console.log(`onChange2 startp sid:${startp.sid}`,{startp});

//				loop.stations[1].elevation = undefined;
				loop = loop;
				await refresh_loop(loop, {fetch_gps:true})
//				loop.stations[1].elevation = loop.stations[1].elevation;
//				loop.startp.elevation = loop.startp.elevation;
				break;
			}

		case endp : {
				console.log(`onChange endp sid:${endp.sid}`,{endp});
	//			endp.gps_elevation = 99.999;
				assert(endp.sid, 'fatal@203')
				const {sid,z,error} = await get_gps_data(endp.sid)
				if (error) break;


				endp.sid = sid;
				endp.gps_elevation = +z;
				console.log(`onChange2 startp sid:${endp.sid}`,{endp});
				assert(endp.gps_elevation == endp_.gps_elevation, 'fatal@210')

//				loop.stations[1].elevation = undefined;
//				loop.stations = loop.stations;
				//loop = loop;
				await refresh_loop(loop, {fetch_gps:true})
				loop = loop;

//				endp_.gps_elevation = 99.999;
//				return;
				break;
			}

		default:
			console.log('onChange unknown endp_',{endp_})
			return;
	}

//	recompute();
	assert(startp == loop.startp, 'fatal@221');
	assert(endp == loop.endp, 'fatal@22');
}

//let startp_unsafe_flag = '';
let startp_unsafe_flag = '#';

function every_sid_keydown() {
	const endp_ = this.endp
	console.log(`every_sid_keydown`,{endp_})
	endp_.sid_ = endp_.sid_ || endp_.sid;
	console.log(`every_sid_keydown endp_.sid:${endp_.sid_} => ${endp_.sid}`)
}

function every_sid_keyup() {

	const endp_ = this.endp
	console.log(`every_sid_keyup`,{endp_})
	switch(endp_) {
		case startp :
				console.log(`keyup on startp gps:${startp.gps_elevation}`,{startp});
//				startp.sid_ = startp.sid_ || startp.sid;
//				console.log(`startp.sid:${startp.sid} <> ${startp.sid_}`)
				console.log(`every_sid_keyup endp_.sid:${endp_.sid_} => ${endp_.sid}`)
				recompute_flag = endp_.invalid = (endp_.sid_ != endp_.sid);
				startp = endp_;
				break;
		case endp :
				//console.log(`keyup on endp gps:${endp.gps_elevation}`,{endp});
//				endp_.invalid = (endp_.sid_ != endp_.sid);
//				endp = endp_;
				console.log(`every_sid_keyup endp: ${endp_.sid_} => ${endp_.sid}`)
				endp_.invalid = (endp_.sid_ != endp_.sid);
				endp = endp_;
				break;
		default:
			console.log('unknown endp_',{endp_})
			return;
	}
}

</script>

<Modal2 isOpenModal={isOpenModal} endp={endp_Modal} on:closeModal={closeModal2} />

<table>
<tr>
  <b style="color:brown;">LOOP {loopNo+1}</b>
</tr>

<tr>
  <td>FS</td>
  <td>BS</td>
  <td>Mean</td>
  <td>Dist.</td>
  <td>Station Identification</td>
  <td></td>
	<td></td>
  <td>
		<vbox class="qc">
			<hbox>Comp.</hbox>
			<hbox>Elev.</hbox>
		</vbox>
	</td>
	<td>
		<vbox class="qc">
			<hbox>Adjusted</hbox>
			<hbox>Elev.</hbox>
		</vbox>
	</td>
  <td style="text-align:center"><b>GPS</b></td>
</tr>

<tr>
   <td class="hrule-blue-bottom" colspan="100%" style="padding:5pt 0 0 0;"></td>
 </tr>

<tr style="border-bottom:0px solid blue;">
  <td style="padding-bottom:5px;"></td>
</tr>


  <tr>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
    <td><input class="tag {loop.startp.class_} "
      bind:value={loop.startp.sid}
			on:keyup={every_sid_keyup.bind({endp:loop.startp})}
			on:keydown={every_sid_keydown.bind({endp:loop.startp})}
			on:change={every_sid_change.bind({endp:loop.startp})}
      >
    </td>

		<td></td> <!-- checkbox -->

    <td>
			<!--
			<button on:click={function(){
						modal_target_gps = loop.startp;
						//getModal().open();
					}}
						>
	      CB
	    </button> -->

			<!--
			<Modal show={$modal}>
			  <button on:click={function(){showModal(loop.startp)}}>CB</button>
			</Modal> -->


			<button on:click={openModal2.bind({endp:loop.startp})}>CB</button>

    </td>


    <td class="elevation"
			style="{(recompute_flag)?'color:#8b8b8b;':''}"
			>
			{(startp.elevation)? (+startp.elevation).toFixed(3):'???'}
		</td>

		<td></td>

    <td bind:this={loop.startp.tdz} class="gps-elevation {(startp.invalid)?'dim-brown':'brown'}">
			<b>{(startp.gps_elevation)? (+startp.gps_elevation).toFixed(3):'***'}</b>
		</td>

    <!--
    WE DONT want contenteditatble here.... SO !
    <td contenteditable="true" bind:innerHTML={startp.elevation} class="elevation"></td>
    -->

  </tr>


{#each loop.stations as row, irow}

<tr bind:this={row.tr}>
  <td class={`${(irow%2)?'odd':'even'} ${(row.flag_error)?'red':''}`}>{row.df_}</td>
  <td class={`${(irow%2)?'odd':'even'} ${(row.flag_error)?'red':''}`}>{row.db_}</td>
  <td class={(irow%2)?'odd':'even'}>{row.mean_}</td>
  <td class="{(irow%2)?'odd':'even'}">{row.dist_}</td>

  {#if (irow>= loop.stations.length-1)}

  <td class="{(irow%2)?'odd':'even'}">
		<input class="tag {row.class_}" valuex={row.sid}
    bind:value={endp.sid}
		on:keyup={every_sid_keyup.bind({endp:loop.endp})}
		on:keydown={every_sid_keydown.bind({endp:loop.endp})}
		on:change={every_sid_change.bind({endp:loop.endp})}
    >
  </td>

  {:else}

  <td class="{(irow%2)?'odd':'even'}">
		<input class="tag {row.class_}" valuex={row.sid}
    bind:value={row.sid}
    >
  </td>
  {/if}

	<td class="{(irow%2)?'odd':'even'}">
		<input type="checkbox"
				bind:checked={row.active}
				on:change={function(){refresh_loop(loop)}}
				>
	</td>

	<td class="{(irow%2)?'odd':'even'}">
	{#if (irow>= loop.stations.length-1)}

		<!--
		<Modal show={$modal}>
			<button on:click={function(){showModal(loop.endp)}}>CB</button>
		</Modal> -->

		<button on:click={openModal2.bind({endp:loop.endp, from:'endp'})}>CB</button>

	{/if}
	</td>


  <!--
  No need two ways binding.
  <td bind:this={row.tdz} class="elevation"></td>
  -->

	<td class="{(irow%2)?'odd':'even'} elevation"
		style="{(recompute_flag)?'color:#8b8b8b;':''}">
		{#if row.active}
	  {(row.elevation)? row.elevation.toFixed(3):''}
		{:else}
		***
		{/if}
	</td>


	<td class="adj {(irow%2)?'odd':'even'}"
		style="{(recompute_flag)?'color:#8b8b8b;':''}">
		{#if row.active}
	  {(row.adj)? row.adj.toFixed(5):''}
		{:else}
		***
		{/if}
	</td>


  <td class="{(irow%2)?'odd':'even'} gps-elevation {(endp.invalid)?'dim-brown':'brown'}">
		{#if (irow>= loop.stations.length-1)}
		<!--
		{(row.gps_elevation)? row.gps_elevation.toFixed(3):'***'} -->
		<b>{(endp.gps_elevation)? (+endp.gps_elevation).toFixed(3):'***'}</b>
		{/if}
	</td>
</tr>

{/each}

<!--
<td><input type="checkbox"
      id={row.sid}
      bind:this|preventDefault={row.input}
      bind:checked={row.checked}
      on:change|preventDefault={(e)=>toggle_checkbox(e,row)} />
</td>

-->



<tr>
  <td class="hrule-blue-bottom" colspan="100%" style="padding:5pt 0 0pt 0;"></td>
</tr>

<tr>
  <td colspan="100%" style="padding:0pt 0 5pt 0;"></td>
</tr>


<tr style="border-top:0px solid green;
    padding-top:15px;
  ">

  <td>{loop.df_sum.toFixed(3)}</td>
  <td>{loop.db_sum.toFixed(3)}</td>
  <td>{loop.mean_sum.toFixed(3)}</td>
  <td>{loop.dist_sum.toFixed(3)}</td>
  <td>SUMMARY</td>
  <td>
    <!--
    <button type="button"
      on:click={(e)=>summary(loop)}>CB
    </button>
    -->
  </td>
  <td></td>
	<!--
  <td><button style="{(recompute_flag == true)?'color:red;':''}"
    on:click={function(){refresh_loop(loop,{fetch_gps:true})}}>recompute</button>
  </td>
  <td><button
    on:click={(e)=>publish(loop)}>publish</button>
  </td>
	-->
  </tr>
	</table>

	<table style="margin-top:10pt;">
	<tr>
		<td colspan="9"></td>
		<td colspan="2"><button style="{(recompute_flag == true)?'color:red;':''}"
			on:click={refresh_loop_}
			>
			recompute
		</button>
	  </td>
	  <td><button
	    on:click={(e)=>publish(loop)}>publish</button>
	  </td>
	</tr>


  <!--

        INFORMATION PANEL

  -->

  <tr>
    <td colspan="100%" style="text-align:center">
      {#if recompute_flag}
      <hbox class="qc"
        style="width:80%; border: 1px solid orange;margin:10pt;padding:10pt;color:orange">
        <b>ALERT UNSAFE LOOP DATA</b>
      </hbox>
      {/if}
    </td>
  </tr>


  <!--
              URL link tp pdf
  -->

  <tr>
    <td colspan="100%" style="text-align:center">
      {#if busy_message.color != 'white'}
      <hbox class="qc"
        style="width:100%; -border: 1px solid orange; -margin:10pt; padding:5pt;color:{busy_message.color}">
        {@html busy_message.message}
      </hbox>
      {/if}
    </td>
  </tr>


  <tr><td>&emsp</td></tr>
  <tr>
    <td colspan="4">gps-elevation at endpoint:</td>
    <td style="text-align: left;"> {loop.endp && loop.endp.gps_elevation && (+loop.endp.gps_elevation).toFixed(3)}</td>
  </tr>
  <tr>
    <td colspan="4">computed-elevation at endpoint:</td>
    <td style="text-align: left;"> {loop.endp && loop.endp.elevation && loop.endp.elevation.toFixed(3)}</td>
    <td colspan="3"> err: {loop.error && loop.error.toFixed(3)}</td>
    <td colspan="2"> ae: {loop.ae && loop.ae.toFixed(3)}</td>
  </tr>
  <tr><td>&emsp</td></tr>
  <tr><td>&emsp</td></tr>

<!--
  <tr>
    <td></td>
    <td></td>
    <td></td>
    <td style="color:red">0.0072</td>
    <td style="color:red; text-align:center;">&lt; 0.0066 Quality Failed</td>
  </tr>
-->

</table>

<style media="screen">

table {
	-display:grid;
	column-gap:0;
}
td {
  text-align: right;
  --width:100pt;
  padding: 0 10px;
}

button {
	font-size:15px;
}

.red {color:red;}
.brown {color:brown;}
.dim-brown {color:#d48888;}

button.green {color:green;}

input.tag {
  height:20pt;
  font-size: 12pt;
  margin-left:10pt;
  width: 120pt;
	font-family: monospace;
}

input.tag .controlp {
  color: red;
}

.hrule-blue-bottom {
  border-bottom:5px solid rgb(135, 137, 247);
}
.hrule-blue-top {
  border-top:5px solid rgb(135, 137, 247);
}

td.even {
	background-color: #BEBEBE;
}

td.elevation {
}
</style>
