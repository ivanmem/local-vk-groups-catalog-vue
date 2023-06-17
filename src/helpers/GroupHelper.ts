import { IGroup } from "@/store/groups/types";
import { FiltersType, useGroups } from "@/store/groups/groups";
import { getGroupState, GroupState } from "@/pages/AGroups/getGroupState";

class GroupHelper {
  static getFiltered(groups: IGroup[], filters?: FiltersType) {
    if (!filters) {
      return groups;
    }

    const groupsService = useGroups();
    const search = filters?.search.trim().toLowerCase();
    return groups.filter((group) => {
      const localGroup = groupsService.getLocalGroupById(group.id);
      if (!localGroup) {
        return false;
      }

      if (
        filters.folder &&
        filters.folder.trim().toLowerCase() !=
          localGroup.folder.trim().toLowerCase()
      ) {
        return false;
      }

      if (
        search?.length > 0 &&
        !group.name.toLowerCase().includes(search) &&
        !GroupHelper.getState(group).text.toLowerCase().includes(search)
      ) {
        return false;
      }

      return true;
    });
  }

  static getState(group: IGroup): GroupState {
    group.__state ??= getGroupState(group);
    return group.__state;
  }
}

export default GroupHelper;
