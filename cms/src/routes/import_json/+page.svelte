<script lang="ts">
  let eventJsonString = localStorage.getItem("eventJson") ?? "";

  $: localStorage.setItem("eventJson", eventJsonString);
</script>

<h1>JSONをインポート</h1>
<div class="json-input">
  <textarea bind:value={eventJsonString}></textarea>
</div>

<style>
  .json-input {
    width: 100%;

    & textarea {
      resize: vertical;
      width: 100%;
      height: 100rem;
      margin-top: 2rem;
    }
  }
</style>
