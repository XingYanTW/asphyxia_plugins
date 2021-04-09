import { ExtraData } from "../models/common";
import * as utils from "./utils";

/**
 * Return the current phases of the game.
 */
export const getInfo = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const result = {
        ir_phase: K.ITEM('s32', 0),
        music_open_phase: K.ITEM('s32', 8),
        collabo_phase: K.ITEM('s32', 8),
        personal_event_phase: K.ITEM('s32', 10),
        shop_event_phase: K.ITEM('s32', 6),
        netvs_phase: K.ITEM('s32', 0),
        card_phase: K.ITEM('s32', 9),
        other_phase: K.ITEM('s32', 9),
        local_matching_enable: K.ITEM('s32', 1),
        n_matching_sec: K.ITEM('s32', 60),
        l_matching_sec: K.ITEM('s32', 60),
        is_check_cpu: K.ITEM('s32', 0),
        week_no: K.ITEM('s32', 0),
        sel_ranking: K.ARRAY('s16', [-1, -1, -1, -1, -1]),
        up_ranking: K.ARRAY('s16', [-1, -1, -1, -1, -1]),
    };

    return send.object(result);
};

/**
 * Create a new profile and send it.
 */
export const newPlayer = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const refid = $(data).str('ref_id');
    if (!refid) return send.deny();

    const name = $(data).str('name');

    send.object(await getProfile(refid, name));
};

/**
 * Read a profile and send it.
 */
export const read = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const refid = $(data).str('ref_id');
    if (!refid) return send.deny();

    send.object(await getProfile(refid));
};

/**
 * Get/create the profile based on refid and format it
 * @param refid the profile refid
 * @param name if defined, create/update the profile with the given name
 */
export const getProfile = async (refid: string, name?: string) => {
    const profile = await utils.readProfile(refid);

    if (name && name.length > 0) {
        profile.name = name;
        await utils.writeProfile(refid, profile);
    }

    // Get Score
    let hiscore_array = Array(Math.floor((((GAME_MAX_MUSIC_ID * 4) * 17) + 7) / 8)).fill(0);
    let clear_medal = Array(GAME_MAX_MUSIC_ID).fill(0);
    let clear_medal_sub = Array(GAME_MAX_MUSIC_ID).fill(0);

    const scoresData = await utils.readScores(refid, version);
    for (const key in scoresData.scores) {
        const keyData = key.split(':');
        const score = scoresData.scores[key];
        const music = parseInt(keyData[0], 10);
        const sheet = parseInt(keyData[1], 10);

        if (music > GAME_MAX_MUSIC_ID) {
            continue;
        }
        if ([0, 1, 2, 3].indexOf(sheet) == -1) {
            continue;
        }

        const medal = {
            100: 1,
            200: 2,
            300: 3,
            400: 5,
            500: 5,
            600: 6,
            700: 7,
            800: 9,
            900: 10,
            1000: 11,
            1100: 15,
        }[score.clear_type];
        clear_medal[music] = clear_medal[music] | (medal << (sheet * 4));

        const hiscore_index = (music * 4) + sheet;
        const hiscore_byte_pos = Math.floor((hiscore_index * 17) / 8);
        const hiscore_bit_pos = ((hiscore_index * 17) % 8);
        const hiscore_value = score.score << hiscore_bit_pos;
        hiscore_array[hiscore_byte_pos] = hiscore_array[hiscore_byte_pos] | (hiscore_value & 0xFF);
        hiscore_array[hiscore_byte_pos + 1] = hiscore_array[hiscore_byte_pos + 1] | ((hiscore_value >> 8) & 0xFF);
        hiscore_array[hiscore_byte_pos + 2] = hiscore_array[hiscore_byte_pos + 2] | ((hiscore_value >> 16) & 0xFF);
    }

    let player: any = {
        base: {
            name: K.ITEM('str', profile.name),
            g_pm_id: K.ITEM('str', '1234-5678'),
            staff: K.ITEM('s8', 0),
            is_conv: K.ITEM('s8', -1),
            collabo: K.ITEM('u8', 255),

            // TODO: replace with real data
            total_play_cnt: K.ITEM('s32', 100),
            today_play_cnt: K.ITEM('s16', 50),
            consecutive_days: K.ITEM('s16', 365),
            my_best: K.ARRAY('s16', Array(20).fill(-1)),
            latest_music: K.ARRAY('s16', [-1, -1, -1]),
            active_fr_num: K.ITEM('u8', 0),
            clear_medal: K.ARRAY('u16', clear_medal),
            clear_medal_sub: K.ARRAY('u8', clear_medal_sub),
        },
        netvs: {
            rank_point: K.ITEM('s32', 0),
            record: K.ARRAY('s16', [0, 0, 0, 0, 0, 0]),
            rank: K.ITEM('u8', 0),
            vs_rank_old: K.ITEM('s8', 0),
            dialog: [
                K.ITEM('str', 'dialog#0'),
                K.ITEM('str', 'dialog#1'),
                K.ITEM('str', 'dialog#2'),
                K.ITEM('str', 'dialog#3'),
                K.ITEM('str', 'dialog#4'),
                K.ITEM('str', 'dialog#5'),
            ],
            ojama_condition: K.ARRAY('s8', Array(74).fill(0)),
            set_ojama: K.ARRAY('s8', [0, 0, 0]),
            set_recommend: K.ARRAY('s8', [0, 0, 0]),
            netvs_play_cnt: K.ITEM('u8', 0),
        },
        hiscore: K.ITEM('bin', Buffer.from(hiscore_array)),
        gakuen_data: {
            music_list: K.ITEM('s32', -1),
        },
        flying_saucer: {
            music_list: K.ITEM('s32', -1),
            tune_count: K.ITEM('s32', -1),
            clear_norma: K.ITEM('u32', 0),
            clear_norma_add: K.ITEM('u32', 0),
        },
        triple_journey: {
            music_list: K.ITEM('s32', -1),
            boss_damage: K.ARRAY('s32', [65534, 65534, 65534, 65534]),
            boss_stun: K.ARRAY('s32', [0, 0, 0, 0]),
            magic_gauge: K.ITEM('s32', 0),
            today_party: K.ITEM('s32', 0),
            union_magic: K.ITEM('bool', false),
            base_attack_rate: K.ITEM('float', 1.0),
            iidx_play_num: K.ITEM('s32', 0),
            reflec_play_num: K.ITEM('s32', 0),
            voltex_play_num: K.ITEM('s32', 0),
            iidx_play_flg: K.ITEM('bool', true),
            reflec_play_flg: K.ITEM('bool', true),
            voltex_play_flg: K.ITEM('bool', true),
        },
        ios: {
            continueRightAnswer: K.ITEM('s32', 30),
            totalRightAnswer: K.ITEM('s32', 30),
        },
        kac2013: {
            music_num: K.ITEM('s8', 0),
            music: K.ITEM('s16', 0),
            sheet: K.ITEM('u8', 0),
        },
        baseball_data: {
            music_list: K.ITEM('s64', BigInt(-1)),
        },
        floor_infection: [
            {
                infection_id: K.ITEM('s32', 3),
                music_list: K.ITEM('s32', -1),
            },
            {
                infection_id: K.ITEM('s32', 5),
                music_list: K.ITEM('s32', -1),
            },
            {
                infection_id: K.ITEM('s32', 7),
                music_list: K.ITEM('s32', -1),
            }
        ]
    };

    // Add version specific datas
    const params = await utils.readParams(refid, version);
    utils.addExtraData(player, params, extraData);

    return player;
}

/**
 * Unformat and write the end game data into DB
 */
export const write = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const refid = $(data).attr()['ref_id'];
    if (!refid) return send.deny();

    const params = await utils.readParams(refid, version);
    utils.getExtraData(data, params, extraData);
    await utils.writeParams(refid, version, params);

    const scoresData = await utils.readScores(refid, version, true);

    for (const scoreData of $(data).elements('stage')) {
        const music = scoreData.number('no', -1);
        const sheet = scoreData.number('sheet');
        const clear_type = {
            1: 100,
            2: 200,
            3: 300,
            5: 500,
            6: 600,
            7: 700,
            9: 800,
            10: 900,
            11: 1000,
            15: 1100,
        }[(scoreData.number('n_data') >> (sheet * 4)) & 0x000F];
        const score = scoreData.number('score', 0);

        const key = `${music}:${sheet}`;

        if (!scoresData.scores[key]) {
            scoresData.scores[key] = {
                score,
                cnt: 1,
                clear_type
            };
        } else {
            scoresData.scores[key] = {
                score: Math.max(score, scoresData.scores[key].score),
                cnt: scoresData.scores[key].cnt + 1,
                clear_type: Math.max(clear_type, scoresData.scores[key].clear_type || 0)
            };
        }
    }

    utils.writeScores(refid, version, scoresData);

    const profile = await utils.readProfile(refid);

    const result = {
        pref: K.ITEM('s8', -1),
        name: K.ITEM('str', profile.name)
    }

    send.object(result);
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const version: string = 'v21';
const GAME_MAX_MUSIC_ID = 1350;

const extraData: ExtraData = {
    mode: { type: 'u8', path: 'base', pathSrc: '', default: 0 },
    button: { type: 's8', path: 'base', pathSrc: '', default: 0 },
    last_play_flag: { type: 's8', path: 'base', pathSrc: '', default: -1 },
    medal_and_friend: { type: 'u8', path: 'base', pathSrc: '', default: 0 },
    category: { type: 's8', path: 'base', pathSrc: '', default: -1 },
    sub_category: { type: 's8', path: 'base', pathSrc: '', default: -1 },
    chara: { type: 's16', path: 'base', pathSrc: '', default: -1 },
    chara_category: { type: 's8', path: 'base', pathSrc: '', default: -1 },
    sheet: { type: 'u8', path: 'base', pathSrc: '', default: 0 },
    tutorial: { type: 's8', path: 'base', pathSrc: '', default: 0 },
    music_open_pt: { type: 's8', path: 'base', pathSrc: '', default: 0 },
    option: { type: 's32', path: 'base', pathSrc: '', default: 0 },
    music: { type: 's16', path: 'base', pathSrc: '', default: -1 },
    ep: { type: 'u16', path: 'base', pathSrc: '', default: 0 },
    sp_color_flg: { type: 's32', path: 'base', pathSrc: '', default: [0, 0], isArray: true },
    read_news: { type: 's32', path: 'base', pathSrc: '', default: 0 },
    consecutive_days_coupon: { type: 's16', path: 'base', pathSrc: '', default: 0 },
    gitadora_point: { type: 'u16', path: 'base', pathSrc: '', default: [2000, 2000, 2000], isArray: true },
    gitadora_select: { type: 'u8', path: 'base', pathSrc: '', default: 2 },

    sp: { type: 's32', path: 'sp_data', default: 0 },

    point: { type: 'u16', path: 'zoo', default: [0, 0, 0, 0, 0], isArray: true },
    music_list__2: { type: 's32', path: 'zoo', default: [0, 0], isArray: true },
    today_play_flag: { type: 's8', path: 'zoo', default: [0, 0, 0, 0], isArray: true },

    hair: { type: 'u8', path: 'avatar', pathSrc: '', default: 0 },
    face: { type: 'u8', path: 'avatar', pathSrc: '', default: 0 },
    body: { type: 'u8', path: 'avatar', pathSrc: '', default: 0 },
    effect: { type: 'u8', path: 'avatar', pathSrc: '', default: 0 },
    object: { type: 'u8', path: 'avatar', pathSrc: '', default: 0 },
    comment: { type: 'u8', path: 'avatar', pathSrc: '', default: [0, 0], isArray: true },
    get_hair: { type: 's32', path: 'avatar', pathSrc: '', default: [0, 0], isArray: true },
    get_face: { type: 's32', path: 'avatar', pathSrc: '', default: [0, 0], isArray: true },
    get_body: { type: 's32', path: 'avatar', pathSrc: '', default: [0, 0], isArray: true },
    get_effect: { type: 's32', path: 'avatar', pathSrc: '', default: [0, 0], isArray: true },
    get_object: { type: 's32', path: 'avatar', pathSrc: '', default: [0, 0], isArray: true },
    get_comment_over: { type: 's32', path: 'avatar', pathSrc: '', default: [0, 0, 0], isArray: true },
    get_comment_under: { type: 's32', path: 'avatar', pathSrc: '', default: [0, 0, 0], isArray: true },

    get_hair__1: { type: 's32', path: 'avatar_add', default: [0, 0], isArray: true },
    get_face__1: { type: 's32', path: 'avatar_add', default: [0, 0], isArray: true },
    get_body__1: { type: 's32', path: 'avatar_add', default: [0, 0], isArray: true },
    get_effect__1: { type: 's32', path: 'avatar_add', default: [0, 0], isArray: true },
    get_object__1: { type: 's32', path: 'avatar_add', default: [0, 0], isArray: true },
    get_comment_over__1: { type: 's32', path: 'avatar_add', default: [0, 0], isArray: true },
    get_comment_under__1: { type: 's32', path: 'avatar_add', default: [0, 0], isArray: true },
    new_face: { type: 's32', path: 'avatar_add', default: [0, 0], isArray: true },
    new_body: { type: 's32', path: 'avatar_add', default: [0, 0], isArray: true },
    new_effect: { type: 's32', path: 'avatar_add', default: [0, 0], isArray: true },
    new_object: { type: 's32', path: 'avatar_add', default: [0, 0], isArray: true },
    new_comment_over: { type: 's32', path: 'avatar_add', default: [0, 0], isArray: true },
    new_comment_under: { type: 's32', path: 'avatar_add', default: [0, 0], isArray: true },
}