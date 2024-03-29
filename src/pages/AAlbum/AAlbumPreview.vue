<script lang="ts" setup>
import { computed, h } from "vue";
import { PhotoHelper } from "@/helpers/PhotoHelper";
import { showContextMenu } from "@/helpers/showContextMenu";
import { icons } from "@/common/consts";
import { openUrl } from "@/helpers/openUrl";
import { IPhoto } from "@/store/groups/types";

const props = defineProps<{
  photo: IPhoto;
  sizes: { width: number; height: number };
}>();
const originalSize = computed(() =>
  PhotoHelper.getOriginalSize(props.photo.sizes)
);
const previewSize = computed(() =>
  PhotoHelper.getPreviewSize(props.photo.sizes, props.sizes)
);

const onShowContextMenu = (e: MouseEvent) => {
  showContextMenu(e, [
    {
      label: "Открыть оригинал",
      icon: h(icons.Icon16Link),
      onClick: () => {
        if (originalSize.value) {
          openUrl(originalSize.value.url);
        }
      }
    },
    {
      label: "Скачать",
      icon: h(icons.Icon16DownloadOutline),
      onClick: () => {
        return PhotoHelper.downloadPhoto(props.photo);
      }
    }
  ]);
};
</script>
<template>
  <div
    class="a-not-dragable-and-not-select photos_row"
    @contextmenu.stop.prevent="onShowContextMenu"
  >
    <img
      v-if="previewSize"
      :src="previewSize.url"
      alt=""
      class="a-not-dragable-and-not-select"
    />
    <div class="a-not-dragable-and-not-select photos_row__title_wrap"></div>
  </div>
</template>
<style lang="scss">
.photos_row {
  background-color: var(--placeholder_icon_background);
  background-position: center 35%;
  background-repeat: no-repeat;
  background-size: cover;
  cursor: pointer;
  display: inline-block;
  height: v-bind("`${props.sizes.height}px`");
  min-height: v-bind("`${props.sizes.height}px`");
  min-width: v-bind("`${props.sizes.width}px`");
  position: relative;
  vertical-align: top;
  width: v-bind("`${props.sizes.width}px`");

  img {
    height: 100%;
    object-fit: cover;
    width: 100%;
  }
}

.photos_row__title_wrap {
  bottom: 0;
  box-shadow: -2px -2px 4px 0px rgba(0, 0, 0, 0.4) inset;
  color: white;
  left: 0;
  padding: 35px 12px 9px;
  position: absolute;
  right: 0;
  top: 0;

  small {
    opacity: 0.7;
  }
}
</style>
