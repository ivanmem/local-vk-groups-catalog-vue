import { computed, ref, watch } from "vue";
import { useGroups } from "@/store/groups/groups";
import GroupHelper from "@/helpers/GroupHelper";
import { useSwipes } from "@/composables/useSwipes";
import last from "lodash/last";
import { useActivated } from "@/composables/useActivated";

export type UseGroupSearch = ReturnType<typeof useGroupSearch>;

export function useGroupSearch() {
  const store = useGroups();
  const groupsOrder = computed(() =>
    GroupHelper.getFiltered(store.groupsIdsReverse, store.filters),
  );
  const showFilters = ref(false);
  const swipes = useSwipes({
    onLeft: () => {
      if (!store.filters.folder) {
        store.filters.folder = last(store.folders) ?? "";
        return;
      }

      const currentIndex = store.folders.indexOf(store.filters.folder);
      if (currentIndex === 0 || currentIndex === -1) {
        store.filters.folder = "";
        return;
      }

      store.filters.folder = store.folders[currentIndex - 1];
    },
    onRight: () => {
      if (!store.filters.folder) {
        store.filters.folder = store.folders[0] ?? "";
        return;
      }

      const currentIndex = store.folders.indexOf(store.filters.folder);
      if (
        currentIndex === store.filters.folder.length - 1 ||
        currentIndex === -1
      ) {
        store.filters.folder = "";
        return;
      }

      store.filters.folder = store.folders[currentIndex + 1] ?? "";
    },
  });
  const isActivated = useActivated();

  watch(
    isActivated,
    () => {
      if (isActivated.value) {
        store.loadNotLoadGroups().then();
      }
    },
    { immediate: true },
  );

  return {
    groupsOrder,
    showFilters,
    swipes,
  };
}
