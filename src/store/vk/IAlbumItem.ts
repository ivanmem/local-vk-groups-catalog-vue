import { IPhotoSize } from "vkontakte-api";
import { IPhoto } from "@/store/groups/types";

export interface IAlbumItem {
  id: number | string;
  owner_id: number;
  size: number | string;
  title: string;
  feed_disabled?: number;
  feed_has_pinned?: number;
  can_delete?: boolean;
  can_include_to_feed?: boolean;
  sizes?: IPhotoSize[];
  thumb_id?: number;
  thumb_src?: string;
  can_upload?: number;
  created?: number;
  description?: string;
  updated?: number;
  thumb_is_last?: number;
}

export interface PhotosGetAlbums {
  count: number;
  items: IAlbumItem[];
}

export interface PhotosGet {
  count: number;
  items: IPhoto[];
}
