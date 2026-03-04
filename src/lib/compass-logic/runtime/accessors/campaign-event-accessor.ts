// import type { DB } from '@/stores/db/hooks/types';
import type { CampaignEvent } from '@/types';
import type Dexie from 'dexie';
import { CampaignSceneAccessor } from './campaign-scene-accessor';

/**
 * Accessor for a campaign event in legacy campaign event scripts.
 *
 * New Game Manager based campaign events no longer inject this accessor;
 * scripts should use the top-level `Scene` accessor instead.
 */
export class CampaignEventAccessor {
  // private db: DB;
  private event: CampaignEvent;
  private campaignSceneId: string | null;
  // private rulesetId: string;
  private campaignId: string;
  private getSceneAccessor: () => CampaignSceneAccessor | null;

  constructor(
    db: Dexie,
    event: CampaignEvent,
    rulesetId: string,
    campaignSceneId: string | null,
    getSceneAccessor: () => CampaignSceneAccessor | null,
  ) {
    // this.db = db as DB;
    this.event = event;
    // this.rulesetId = rulesetId;
    this.campaignSceneId = campaignSceneId;
    this.campaignId = event.campaignId;
    this.getSceneAccessor = getSceneAccessor;
  }

  get id(): string {
    return this.event.id;
  }

  get label(): string {
    return this.event.label;
  }

  get campaignIdValue(): string {
    return this.campaignId;
  }

  /**
   * Return a CampaignScene accessor for the scene this event is running in.
   * When the event is not associated with a scene, returns null.
   */
  Scene(): CampaignSceneAccessor | null {
    if (!this.campaignSceneId) return null;
    return this.getSceneAccessor();
  }

  toStructuredCloneSafe(): { __type: 'CampaignEvent'; id: string; label: string } {
    return {
      __type: 'CampaignEvent',
      id: this.event.id,
      label: this.event.label,
    };
  }
}
