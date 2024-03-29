import { IAlbumItem } from "@/store/vk/IAlbumItem";
import { useVk } from "@/store/vk/vk";
import { AlbumsPreviewSizesInitial } from "@/pages/AAlbums/consts";
import { computed, MaybeRefOrGetter, ref, toValue, watch } from "vue";
import { useCurrentPhoto } from "@/pages/AAlbum/useCurrentPhoto";
import { useScreenSpinner } from "@/composables/useScreenSpinner";
import { useSizesColumns } from "@/composables/useSizesColumns";
import { RecycleScroller } from "vue-virtual-scroller";
import { toStr } from "@/helpers/toStr";
import { useGroups } from "@/store/groups/groups";
import { useHistory } from "@/store/history/history";
import { toNumberOrUndefined } from "@/helpers/toNumberOrUndefined";
import { IPhoto, IPhotoKey } from "@/store/groups/types";
import { PhotoHelper } from "@/helpers/PhotoHelper";
import { errorToString } from "@/helpers/errorToString";

const countOneLoad = 150;

export function useAlbum(
  ownerIdGetter: MaybeRefOrGetter<number | string>,
  albumIdGetter: MaybeRefOrGetter<number | string>,
  photoIdGetter: MaybeRefOrGetter<number | string | undefined>,
) {
  const photos = ref<IPhoto[]>([]);
  const photosMap = ref<Map<IPhotoKey, IPhoto>>(new Map());
  const ownerId = computed(() => toValue(ownerIdGetter));
  const albumId = computed(() => {
    const value = toValue(albumIdGetter);
    return value == "wall" ? -7 : value;
  });
  const photoId = computed(() => toValue(photoIdGetter));
  const photo = computed(
    () =>
      photosMap.value?.get(
        PhotoHelper.getPhotoKeyOrUndefined(ownerId.value, photoId.value) ??
          ("" as IPhotoKey),
      ),
  );
  const album = ref<IAlbumItem | undefined>();
  const albumRef = ref<InstanceType<typeof RecycleScroller>>();
  const { sizes, gridItems } = useSizesColumns(
    albumRef,
    AlbumsPreviewSizesInitial,
  );
  const screenError = ref<any>();
  const isInit = ref(false);
  const isLoadingPhotos = ref(false);
  const isLoadAllPhotos = ref(false);
  const photosMaxItems = ref(countOneLoad);
  const historyStore = useHistory();
  const groupsStore = useGroups();
  const vkStore = useVk();
  const albumHistoryItem = computed(() =>
    historyStore.getViewAlbum(ownerId.value, albumId.value),
  );
  const albumCount = computed(
    () =>
      toNumberOrUndefined(album.value?.size) ??
      (isLoadAllPhotos ? photos.value.length : `${photos.value.length}+`),
  );

  useScreenSpinner(() => !isInit.value);

  const onMoreLoad = () => {
    if (isLoadingPhotos.value) {
      return;
    }

    // защищаем от переполнения
    if (
      photosMaxItems.value - photos.value.length < 1000 &&
      !isLoadAllPhotos.value
    ) {
      photosMaxItems.value += countOneLoad;
    }
  };

  const {
    currentPhoto,
    currentPhotoIndex,
    setCurrentPhotoIndex,
    setCurrentPhotoId,
    onSwitchPhoto,
  } = useCurrentPhoto(
    photos,
    photosMap,
    photoId,
    ownerId,
    isLoadingPhotos,
    isInit,
    onMoreLoad,
  );

  const onClearPhotos = () => {
    photos.value.length = 0;
    photosMap.value.clear();
    photosMaxItems.value = countOneLoad;
    isLoadAllPhotos.value = false;
  };

  const onClearAlbum = () => {
    album.value = undefined;
  };

  const onClearInit = () => {
    isInit.value = false;
  };

  const onClearError = () => {
    screenError.value = undefined;
  };

  const onUpdateAlbum = async () => {
    album.value = await vkStore
      .getCachedAlbum(ownerId.value, albumId.value)
      .catch((ex) => {
        if (ex?.errorInfo && ex.errorInfo.error_code !== 15) {
          screenError.value = errorToString(ex);
          console.warn("Необработанная ошибка:", ex.errorInfo);
        }

        return undefined;
      });
  };

  const onLoad = async () => {
    const currentPhotosMaxItems = photosMaxItems.value;
    if (
      isLoadingPhotos.value ||
      currentPhotosMaxItems === 0 ||
      isLoadAllPhotos.value
    ) {
      return;
    }

    isLoadingPhotos.value = true;
    screenError.value = undefined;
    const offset = photos.value.length;
    const count = currentPhotosMaxItems - offset;
    try {
      const { items }: { items: IPhoto[] } = await vkStore.photosGet({
        album_id: albumId.value,
        owner_id: ownerId.value,
        offset,
        count,
        rev: groupsStore.config.reverseOrder ? 1 : 0,
        extended: 1,
        photo_sizes: 1,
      });
      if (items.length === 0) {
        isLoadAllPhotos.value = true;
      }

      for (let newPhoto of items) {
        newPhoto.__state = {
          index: photos.value.length,
        };
        photosMap.value.set(
          PhotoHelper.getPhotoKey(newPhoto.owner_id, newPhoto.id),
          newPhoto,
        );
        photos.value.push(newPhoto);
      }
    } catch (ex: any) {
      screenError.value = errorToString(ex);
    }
    isInit.value = true;
    isLoadingPhotos.value = false;
    albumRef.value?.updateVisibleItems(true);
  };

  const onScrollerUpdate = (
    startIndex: number,
    endIndex: number,
    visibleStartIndex: number,
    visibleEndIndex: number,
  ) => {
    if (endIndex + countOneLoad / 3 < photosMaxItems.value) {
      return;
    }

    onMoreLoad();
  };

  watch([albumHistoryItem, album, currentPhotoIndex], () => {
    if (
      !albumHistoryItem.value ||
      !album.value ||
      currentPhotoIndex.value === undefined
    ) {
      return;
    }

    albumHistoryItem.value.subtitle = `${album.value.title} (${
      currentPhotoIndex.value + 1
    } из ${albumCount.value})`;
  });

  watch(
    [ownerId, albumId],
    async () => {
      onClearInit();
      onClearError();
      onClearPhotos();
      onClearAlbum();
      await onUpdateAlbum();
      await onLoad();
    },
    { immediate: true },
  );

  watch(
    () => groupsStore.config.reverseOrder,
    async () => {
      onClearError();
      onClearPhotos();
      await onLoad();
    },
  );

  watch(photosMaxItems, onLoad, { immediate: true });

  watch(
    [photoId, isLoadingPhotos],
    () => {
      if (toStr(photoId.value).length && !isLoadingPhotos.value) {
        if (photo.value !== undefined) {
          albumRef.value?.scrollToItem(photo.value.__state.index);
        } else if (!screenError.value) {
          onMoreLoad();
        }
      }
    },
    { immediate: true, deep: true },
  );

  return {
    photos,
    album,
    albumCount,
    currentPhoto,
    currentPhotoIndex,
    setCurrentPhotoId,
    setCurrentPhotoIndex,
    isInit,
    isLoadingPhotos,
    screenError,
    onScrollerUpdate,
    onSwitchPhoto,
    albumRef,
    gridItems,
    isLoadAllPhotos,
    sizes,
  };
}
