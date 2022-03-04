<script>
import {writable} from 'svelte/store'

import XLSX_file_input from './xlsx-file-input.svelte'
import Loop from './survey-loop.svelte'
import Dialog from './edit-gps.svelte';
// import Modal,{getModal} from './Modal.svelte'

let selection;

let loops =[];
//export const loops = writable([]);


	let name;
	let status = 0;

	const onCancel = (text) => {
		name = '';
		status = -1;
	}

	const onOkay = (text) => {
		name = text;
		status = 1;
	}

  const showDialog = () => {
		open(
			Dialog,
			{
				message: "What is your name?",
				hasForm: true,
				onCancel,
				onOkay
			},
			{
				closeButton: false,
    		closeOnEsc: false,
    		closeOnOuterClick: false,
			}
	  );
	};

</script>


<vbox class="container">
  <h2>Differential Levelling</h2>
	<h5>lekkyweb.com</h5>

  <!--
  <XLSX_file_input bind:loops/>
  <XLSX_file_input {loops}/>
  -->

  <XLSX_file_input bind:loops/>

  <!--
  {#each $loops as loop}
  <button on:click={showDialog}>Show a dialog!</button>
  -->


  <!-- Simplest use: modal without an `id` or callback function -->
  <!--
  <button on:click={()=>getModal().open()}>
  	Open First Popup
  </button>
-->

  {#each loops as loop}
  <div class="">
    <Loop {loop}/>
  </div>
  {:else}
  No loops yet
  {/each}


</vbox>






<style media="screen">
h3, h2 {
  text-align:center;
  color: brown;
}
h5 {
	margin-collapse:collapse;
	margin-top: -10px;
  text-align:center;
  color: brown;
}

:global(body) {
  background-color: rgb(200,200,200)
}

</style>
