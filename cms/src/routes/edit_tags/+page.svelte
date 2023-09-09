<script lang="ts">
  import { cubicInOut } from "svelte/easing";
  import { flip } from "svelte/animate";

  import type { eventSchemaType } from "common/schema";
  import { formatDate } from "common/utils";

  const eventJsonRaw = localStorage.getItem("eventJson");
  let eventJson = eventJsonRaw ? (JSON.parse(eventJsonRaw) as eventSchemaType) : undefined;

  $: eventJsonString = JSON.stringify(eventJson, null, 2);
  $: localStorage.setItem("eventJson", eventJsonString);

  const upPhoto = (index: number) => {
    const photos = eventJson?.photos;

    if (eventJson && photos) {
      if (index >= 1) {
        [photos[index - 1], photos[index]] = [photos[index], photos[index - 1]];
        eventJson.photos = photos;
      }
    }
  };

  const downPhoto = (index: number) => {
    const photos = eventJson?.photos;

    if (eventJson && photos) {
      if (index < photos.length - 1) {
        [photos[index], photos[index + 1]] = [photos[index + 1], photos[index]];
        eventJson.photos = photos;
      }
    }
  };
</script>

<h1>タグの編集</h1>
{#if eventJson}
  <h2><input type="text" bind:value={eventJson.meta.title} placeholder="イベント名" /></h2>
  {#each eventJson.photos as photo, index (photo.id)}
    <div class="photo" animate:flip={{ duration: (d) => Math.sqrt(d) * 25, easing: cubicInOut }}>
      <div class="tools">
        <button on:click={() => upPhoto(index)} tabindex="-1">↑</button>
        <button on:click={() => downPhoto(index)} tabindex="-1">↓</button>
      </div>
      <a href={photo.URL} tabindex="-1">
        <img src={photo.thumbnailURL} alt={photo.description} />
      </a>
      <!-- TODO: thumbnailURLsをobjectにする -->
      <div class="tags">
        <input type="text" bind:value={photo.description} placeholder="画像の説明" />
        <input type="text" bind:value={photo.place} placeholder="場所" />
        <span>{formatDate(photo.dateTime, photo.timezone)}</span>
        <span
          >GPS: {photo.exif.gpsLatitude || photo.exif.gpsLatitude || photo.exif.gpsAltitude ? "あり" : "なし"}
        </span>
      </div>
    </div>
  {/each}

  <div class="json-output">
    <textarea bind:value={eventJsonString}></textarea>
  </div>
{:else}
  <p>JSONが見つかりません！まず画像を<a href="upload_images/">アップロード</a>してください。</p>
{/if}

<style>
  .photo {
    display: flex;
    padding: 0.5rem;
    margin: 0.25rem 0;

    border: 2px solid;
    border-radius: 0.5em;

    & img {
      width: 15rem;
    }
  }

  .tools {
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    margin: 0.5rem;

    & button {
      font-size: 1.5rem;
      height: 2rem;
      width: 2rem;

      border: none;
      border-radius: 50%;

      color: #222;
      background-color: #bbb;

      cursor: pointer;

      &:hover {
        opacity: 0.75;
        transition: 0.125s;
      }
    }
  }

  .tags {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin: 0 1rem;
    gap: 0.5em 0;
  }

  input[type="text"] {
    font-size: 1.125rem;
    padding: 0.25em;

    background: #ddd;
    border: none;
    border-radius: 0.25em;
  }

  input[type="text"]:hover,
  input[type="text"]:focus {
    background: #ccc;
  }

  h2 input[type="text"] {
    font-size: 1.25rem;
  }

  .json-output {
    width: 100%;

    & textarea {
      resize: vertical;
      width: 100%;
      height: 100rem;
      margin-top: 2rem;
    }
  }
</style>
