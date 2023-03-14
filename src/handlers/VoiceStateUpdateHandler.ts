import {
    VoiceState,
    Events,
    VoiceChannel,
    VoiceBasedChannel,
    ChannelType,
} from "discord.js";

import Handler from "../interfaces/Handler";
import { DISCORD_CREATING_CHANNEL_ID, DISCORD_CREATING_CHANNEL_CATEGORY_ID } from "../utills/Config";
import ClientManager from "../structures/ClientManager";
import logger from "../utills/Logger";

const clientManager = ClientManager.getInstance();

export default class VoiceStateUpdateHandler implements Handler {
    name: string;
    once: boolean;

    creatingChannel: VoiceChannel;
    createdChannelsMap: Map<string, VoiceBasedChannel>;

    constructor() {
        this.name = Events.VoiceStateUpdate;
        this.once = false;
        this.creatingChannel = this.getCreatingChannel();
        this.createdChannelsMap = new Map<string, VoiceBasedChannel>();
    }

    private getCreatingChannel(): VoiceChannel {
        const creatingChannel = clientManager.client.channels.fetch(DISCORD_CREATING_CHANNEL_ID);
        if (creatingChannel instanceof VoiceChannel) 
            return creatingChannel;
        else
            logger.warn("Getting creatingChannel is failed.");
            return null;
    }

    public async execute(oldState: VoiceState, newState: VoiceState) {
        if (!this.creatingChannel) {
            logger.warn("creatingChannel is null.");
            return;
        }

        if (
            oldState.channelId !== this.creatingChannel.id &&
            this.createdChannelsMap.has(oldState.channelId) &&
            !oldState.channel.members.size
        ) {
            logger.info(
                `Deleted [${oldState.channel.name}] empty voice channel created by creating channel.`
            );
            this.createdChannelsMap.delete(oldState.channelId);
            await oldState.channel.delete();
        }

        if (newState.channelId === this.creatingChannel.id) {
            const createdChannel = await newState.guild.channels.create({
                name: `🔊 ${
                    oldState.member.nickname || oldState.member.displayName
                } 채널`,
                type: ChannelType.GuildVoice,
                parent: DISCORD_CREATING_CHANNEL_CATEGORY_ID,
            });
            logger.info(
                `Created [${createdChannel.name}] temporary voice channel.`
            );
            this.createdChannelsMap.set(createdChannel.id, createdChannel);
            await newState.member.voice.setChannel(createdChannel);
        }
    }
}
