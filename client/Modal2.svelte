<!-- src/Modal.svelte -->

<script>
import assert from 'assert';
export let isOpenModal = false;
//export let endp ={}; // should be used as open....
export let endp; // should be used as open....

import { createEventDispatcher } from 'svelte';
import {setContext} from 'svelte'

const dispatch = createEventDispatcher();

function trap_nan(x,m) {assert(!isNaN(x),m)}


function apply() {
  console.log(`------------------------
    commit-change new-elevation: ${gps_elevation}`,{endp})
  const {sid} = endp;
  Meteor.call('update-gps-data', {sid,gps_elevation}, (err,data)=>{
		if (err) throw err;
		console.log('update-gps-table succeeded.',{data})
    isOpenModal = false;
    trap_nan(gps_elevation, 'fatal@23')
    endp.gps_elevation = +gps_elevation;
    trap_nan(endp.gps_elevation, 'fatal@25')
    dispatch('closeModal', { isOpenModal }); // Modal2::onClose
    /**
    // The caller must refresh and possibly recompute the loop.
    **/
    Object.assign(endp,{gps_elevation})
    trap_nan(endp.gps_elevation, 'fatal@31')
    console.log(`return@28`,{endp})
    return endp;
	})
}

function closeModal() {
  console.log(`closeModal@10`)
    isOpenModal = false;
//    endp.gps_elevation = gps_elevation;
//    assert(!isNaN(endp.gps_elevation),'fatal@27')
    dispatch('closeModal', { isOpenModal }); // Modal2::onClose
}

//  export let modal; // to close
  console.log(`Popup@6`,{endp})
  let gps_elevation = endp && endp.gps_elevation
//  trap_nan(gps_elevation, 'fatal@48')
  // too late setContext('endp',endp); // for AppluBtn

  let allow = endp && (!isNaN(endp.gps_elevation));
  console.log('init Modal2',{allow},{endp})

  let enable_input = false;
  let gps_data_missing = true;

function autorun42() {
  if (!endp) return;
  console.log(`autorun@42 to enable/disable input`,{endp})
//  allow = (endp.gps_elevation != undefined);
//  allow_update = allow;
   gps_data_missing = isNaN(endp.gps_elevation)
   enable_input = !gps_data_missing;
   console.log(`gps_data_missing:${gps_data_missing} enable_input:${enable_input}`)
   assert(!isNaN(endp.gps_elevation),'fatal@60')
   gps_elevation = endp.gps_elevation
   trap_nan(gps_elevation, 'fatal@69')
}

$: autorun42(endp);


</script>


<div id="background"
    on:click={closeModal}
    style="display: {isOpenModal ? 'block' : 'none'};"></div>

<!--
<div id="modal" style="--display: {isOpenModal ? 'block' : 'none'};">
  hello
</div>
-->

<vbox class="qc" id="modal"
  style="--display: {isOpenModal ? 'flex' : 'none'};
  padding:10pt; min-width:500px;
  ">
  {#if endp}
  <p>GPS Station <b>{endp.sid}</b></p>
  {#if gps_data_missing}
  <p style="margin:10pt;">
  <b>this station does not exists in the Database</b>
  </p>
  <hbox style="margin:0 0 10pt 0;">
    check to allow creation
    <input type="checkbox" bind:checked={enable_input}/>
  </hbox>
  {/if}

  {#if enable_input}
  <input type="text" bind:value={gps_elevation}
  style="font-size:16pt; width:60pt;">
  <hbox class="qj" style="width:100%;margin-top:30pt;">
    <button on:click={closeModal}>Quit</button>
    <button on:click={apply}>Apply</button>
  </hbox>
  {/if}
  {/if}
</vbox>


<style>
    #background {
      display: var(--display);
        position: fixed;
        z-index: 1;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(88,88,88,0.5);
    }

    #modal {
      display: var(--display);
        position: fixed;
        z-index: 2;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #fff;
        filter: drop-shadow(0 0 20px #333);
    }

button {
  font-size: 14pt;
}
</style>
