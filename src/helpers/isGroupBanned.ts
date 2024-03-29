import { IGroup } from "@/store/groups/types";

export function isGroupBanned(group: IGroup | undefined) {
  return (
    group?.photo_200 === "https://vk.com/images/deactivated_kis_200.png" ||
    group?.deactivated !== undefined
  );
}
