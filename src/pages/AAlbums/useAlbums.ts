import {
  computed,
  MaybeRefOrGetter,
  ref,
  toValue,
  watch,
} from "vue";
import { IAlbumItem } from "@/store/vk/IAlbumItem";
import { IGroup } from "@/store/groups/types";
import { useGroups } from "@/store/groups/groups";
import {
  AlbumsPreviewSizesInitial,
  getStaticAlbums,
} from "@/pages/AAlbums/consts";
import { useVk } from "@/store/vk/vk";
import { RecycleScroller } from "vue-virtual-scroller";
import { useSizesColumns } from "@/composables/useSizesColumns";
import { useScreenSpinner } from "@/composables/useScreenSpinner";
import { useScrollRestore } from "@/composables/useScrollRestore";

const countOneLoad = 100;

export function useAlbums(ownerIdGetter: MaybeRefOrGetter<number | string>) {
  const groupsStore = useGroups();
  const ownerId = computed(() => toValue(ownerIdGetter));
  const isInit = ref(false);
  useScreenSpinner(() => !isInit.value);
  const albums = ref<IAlbumItem[]>([]);
  const albumsMaxItems = ref(0);
  const isLoadingAlbums = ref(false);
  const group = ref<IGroup | undefined>();
  const staticAlbums = computed(() => getStaticAlbums(ownerId.value));
  const albumsRef = ref<InstanceType<typeof RecycleScroller>>();
  const { sizes, gridItems } = useSizesColumns(
    albumsRef,
    AlbumsPreviewSizesInitial,
  );
  const screenError = ref<any>();

  useScrollRestore(() => albumsRef.value?.$el);

  const onClearComponent = () => {
    isInit.value = false;
    isLoadingAlbums.value = false;
    albums.value.length = 0;
    albumsMaxItems.value = 0;
    group.value = undefined;
    screenError.value = undefined;
  };

  watch(
    ownerId,
    async () => {
      onClearComponent();
      if (+ownerId.value < 0) {
        try {
          group.value = await groupsStore.getGroupByIdOrLoad(-ownerId.value);
        } catch {}
      }

      albumsMaxItems.value = countOneLoad; // это инициирует первую загрузку
    },
    { immediate: true },
  );

  watch(
    albumsMaxItems,
    async () => {
      if (isLoadingAlbums.value || albumsMaxItems.value === 0) {
        return;
      }

      isLoadingAlbums.value = true;
      const offset = albums.value.length;
      const count = albumsMaxItems.value - offset;
      if (count > 0) {
        try {
          const { items } = await useVk().getAlbums(ownerId.value, offset, count);
          albums.value.push(...items);
        } catch (ex: any) {
          albums.value.push(...staticAlbums.value);
          if (ex?.errorInfo && ex.errorInfo.error_code !== 15) {
            screenError.value = ex;
            console.warn("Необработанная ошибка:", ex.errorInfo);
          }
        }
      }

      isLoadingAlbums.value = false;
      isInit.value = true;
      albumsRef.value?.updateVisibleItems(true);
    },
    { immediate: true },
  );

  const onScrollerUpdate = (
    startIndex: number,
    endIndex: number,
    visibleStartIndex: number,
    visibleEndIndex: number,
  ) => {
    if (endIndex + countOneLoad / 3 < albumsMaxItems.value) {
      return;
    }

    albumsMaxItems.value += countOneLoad;
  };

  return {
    isInit,
    group,
    albums,
    isLoadingAlbums,
    gridItems,
    onScrollerUpdate,
    albumsRef,
    screenError,
    sizes,
  };
}
