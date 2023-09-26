<script lang="ts">
  import ExifReader from "exifreader";

  import { onDestroy } from "svelte";
  import { tweened, type Tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";

  import type { signedUrlCollectionType } from "$lib/types/signelUrl";
  import type { eventSchemaType, exifSchemaType } from "common/schema";
  import type { GetBucketPolicyStatusCommand } from "@aws-sdk/client-s3";

  const THUMBNAIL_SIZE = 1620;
  const SMALL_THUMBNAIL_SIZE = 450;
  const R2_DOMAIN = "files.photo.okashi.page";

  let filesDOM: HTMLInputElement;
  let isDragged = false;

  type TargetName = "file" | "step";

  type ProgressType = {
    [key in TargetName]: {
      text: string;
      bar: Tweened<number>;
      barValue: number;
    };
  };

  const progress: ProgressType = {
    file: {
      text: "",
      bar: tweened(0, {
        duration: 400,
        easing: cubicOut,
      }),
      barValue: 0,
    },

    step: {
      text: "",
      bar: tweened(0, {
        duration: 400,
        easing: cubicOut,
      }),
      barValue: 0,
    },
  };
  let isError = false;

  class Progress {
    t: TargetName;

    constructor(target: TargetName) {
      this.t = target;

      progress[target].bar.subscribe((value) => {
        progress[target].barValue = value;
      });
    }

    setText(text: string) {
      progress[this.t].text = text;
      isError = false;
    }

    setErrorText(text: string) {
      progress[this.t].text = text;
      isError = true;
    }

    setValue(progress_: number) {
      progress[this.t].bar.set(progress_);
    }
  }

  const fileProgress = new Progress("file");
  const stepProgress = new Progress("step");

  const getFiles = (event: DragEvent) => {
    isDragged = false;
    if (filesDOM.files && event.dataTransfer && event.dataTransfer.files.length > 0) {
      filesDOM.files = event.dataTransfer.files;
    }
  };

  const toString = (n: number | string | undefined) => {
    if (n === undefined) {
      return n;
    } else {
      return String(n);
    }
  };

  const parseExif = (exif: ExifReader.Tags | undefined): exifSchemaType => {
    if (!exif) {
      return {};
    }

    console.log(exif);

    return {
      make: toString(exif["Make"]?.description),
      model: toString(exif["Model"]?.description),
      exposureTime: toString(exif["ExposureTime"]?.description),
      fNumber: toString(exif["FNumber"]?.description),
      photographicSensitivity: toString(exif["ISOSpeedRatings"]?.description),
      exposureBiasValue: toString(exif["ExposureBiasValue"]?.description),
      focalLength: toString(exif["FocalLength"]?.description),
      focalLengthIn35mmFilm: toString(exif["FocalLengthIn35mmFilm"]?.description),
      lensMake: toString(exif["LensMake"]?.description),
      lensModel: toString(exif["LensModel"]?.description),

      gpsLatitude: parseFloat(exif["GPSLatitude"]?.description ?? "") || undefined,
      gpsLongitude: parseFloat(exif["GPSLongitude"]?.description ?? "") || undefined,
      gpsAltitude: parseFloat(exif["GPSAltitude"]?.description ?? "") || undefined,
    };
  };

  const getDateFromExif = (exif: ExifReader.Tags | undefined): { ISO8601: string; timezone?: string } | undefined => {
    // ISO 8601(タイムゾーン付き)で返却
    if (!exif) {
      return;
    }

    const dateTime = exif["DateTimeOriginal"]?.description;
    const offsetTime = exif["OffsetTimeOriginal"]?.description;

    if (dateTime) {
      const [date_raw, time] = dateTime.split(" ");
      const date = date_raw.replaceAll(":", "-");

      if (offsetTime) {
        return { ISO8601: new Date(`${date}T${time}${offsetTime}`).toJSON(), timezone: offsetTime };
      } else {
        return { ISO8601: new Date(`${date}T${time}Z`).toJSON() };
      }
    }
  };

  const getImageSize = async (file: Blob | File): Promise<{ height: number; width: number }> => {
    const bitmapImage = await createImageBitmap(file);
    return { height: bitmapImage.height, width: bitmapImage.width };
  };

  const resizeImage = async (file: File, size: number): Promise<Blob> => {
    const bitmapImage = await createImageBitmap(file);

    let imgHeight: number;
    let imgWidth: number;

    if (bitmapImage.height > bitmapImage.width) {
      imgHeight = size;
      imgWidth = bitmapImage.width * (imgHeight / bitmapImage.height);
    } else if (bitmapImage.height < bitmapImage.width) {
      imgWidth = size;
      imgHeight = bitmapImage.height * (imgWidth / bitmapImage.width);
    } else {
      imgHeight = size;
      imgWidth = size;
    }

    const canvas = document.createElement("canvas");
    canvas.width = imgWidth;
    canvas.height = imgHeight;

    const ctx = canvas.getContext("2d");
    ctx?.drawImage(bitmapImage, 0, 0, imgWidth, imgHeight);
    const blob = await new Promise((resolve: BlobCallback) => canvas.toBlob(resolve, "image/webp", 0.8));
    return blob ?? new Blob();
  };

  const uploadFileToR2 = async (url: string, file: File | Blob) => {
    await fetch(url, {
      method: "PUT",
      headers: new Headers({
        "Content-Type": file.type,
      }),
      body: file,
    }).then((response) => {
      if (response.ok) {
        return response.text();
      } else {
        fileProgress.setErrorText("ファイルのアップロードに失敗しました");
        return Promise.reject(new Error(`Failed to Upload file: ${response.status} ${response.statusText}`));
      }
    });
  };

  const uploadFiles = async () => {
    let eventJson: eventSchemaType = {
      meta: {
        title: "",
        description: "",
        start_at: "",
      },
      photos: [],
    };

    if (!filesDOM.files) {
      return;
    }

    const files = [...filesDOM.files].filter((file) => /\.(jpg|jpeg)$/i.test(file.name) && file.type == "image/jpeg");

    if (files && files.length > 0) {
      fileProgress.setText("アップロートURLを取得しています");
      stepProgress.setText("");
      fileProgress.setValue(0);
      stepProgress.setValue(0);

      const signedUrls = (await fetch(`/signed_url?quantity=${files.length}&extension=jpg&thumbnail_extensions=webp`, {
        method: "GET",
        headers: new Headers({ Accept: "application/json" }),
      }).then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          fileProgress.setErrorText("アップロートURLの取得に失敗しました！");
          return Promise.reject(new Error(`Failed to get signed url: ${response.status} ${response.statusText}`));
        }
      })) as signedUrlCollectionType;

      await Promise.all(
        signedUrls.map(async (url, index) => {
          fileProgress.setValue(index / signedUrls.length);
          fileProgress.setText(`${signedUrls.length}枚中${index + 1}枚目`);
          const file = files[index];

          stepProgress.setValue(0);
          stepProgress.setText("サムネイルを生成しています");
          const webp = await resizeImage(file, THUMBNAIL_SIZE).catch((err) => {
            stepProgress.setErrorText("サムネイルの生成に失敗しました！");
            throw err;
          });
          const webp_small = await resizeImage(file, SMALL_THUMBNAIL_SIZE).catch((err) => {
            stepProgress.setErrorText("サムネイルの生成に失敗しました！");
            throw err;
          });
          stepProgress.setValue(0.25);

          stepProgress.setText("EXIF情報を取得しています");
          const imageSize = await getImageSize(webp);

          const tags = await ExifReader.load(file);

          const exif: exifSchemaType = parseExif(tags);

          const date = getDateFromExif(tags);
          eventJson.photos.push({
            id: url.id,
            URL: `https://${R2_DOMAIN}/${url.id}.jpg`,
            thumbnailURL: `https://${R2_DOMAIN}/${url.id}_thumbnail.webp`,
            smallThumbnailURL: `https://${R2_DOMAIN}/${url.id}_small.webp`,
            description: "",
            place: "",
            dateTime: date?.ISO8601,
            timezone: date?.timezone,
            aspectRatio: imageSize.height / imageSize.width,
            exif: exif,
          });
          stepProgress.setValue(0.5);

          stepProgress.setText("元画像をアップロートしています");
          uploadFileToR2(url.raw, file);
          stepProgress.setValue(0.75);

          stepProgress.setText("サムネイルをアップロードしています");
          uploadFileToR2(url.thumbnail?.webp ?? "", webp);

          localStorage.setItem("eventJson", JSON.stringify(eventJson, null, 2));
          stepProgress.setText("");
          stepProgress.setValue(1);
        })
      );
    } else {
      fileProgress.setText("対象となる画像がありません。");
      fileProgress.setValue(1);
      stepProgress.setValue(1);
    }
    fileProgress.setText("画像のアップロードが完了しました");
    fileProgress.setValue(1);
  };
</script>

<div
  id="drop_area"
  role="form"
  class:dragged_background={isDragged}
  on:dragover|preventDefault={() => {
    isDragged = true;
  }}
  on:dragleave={() => {
    isDragged = false;
  }}
  on:drop|preventDefault={getFiles}>
  <span>ここにファイルをドロップ</span>
</div>
<input type="file" id="userfile" accept=".jpg, .jpeg" multiple bind:this={filesDOM} />
<button type="submit" disabled={!filesDOM?.value} on:click={uploadFiles}>upload to blob storage</button>

<div class="progresswrapper">
  <progress id="progress-file" class:error={isError} value={progress.file.barValue}
    >{progress.file.barValue * 100} %</progress>
  <label for="progress-file" class:error_text={isError}>{progress.file.text}</label>
</div>

<div class="progress_wrapper">
  <progress id="progress-step" class:error={isError} value={progress.step.barValue}
    >{progress.step.barValue * 100} %</progress>
  <label for="progress-step" class:error_text={isError}>{progress.step.text}</label>
</div>

<style>
  #drop_area {
    height: 10em;
    display: flex;
    align-items: center;
    justify-content: center;

    border: 1px dotted #808080;

    & span {
      color: var(--color-text-gray);
      text-align: center;
    }
  }

  .dragged_background {
    background-color: rgba(30, 180, 255, 0.5);
  }

  label {
    color: var(--color-text);

    &.error_text {
      color: rgb(255, 0, 0);
    }
  }

  .progress_wrapper {
    width: 100%;
    margin: 1rem 0;
  }

  progress {
    height: 0.75rem;
    width: 100%;

    appearance: none;
    -webkit-appearance: none;
    box-shadow: none;
  }

  progress,
  progress::-webkit-progress-bar {
    background-color: #eee;
    border-radius: 0.5rem;
  }

  progress::-webkit-progress-value,
  progress::-moz-progress-bar {
    background-color: rgb(0, 160, 0);
  }
  progress.error::-webkit-progress-value,
  progress.error::-moz-progress-bar {
    background-color: rgb(255, 0, 0);
  }
</style>
