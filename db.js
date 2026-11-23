const SUPABASE_URL = 'https://vhehfoulccctdbotnqvs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ZN-9HnLd__3S-ATQt0lwEQ_ejia2SUd';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function saveScore(playerName, finalScore) {
const { data, error } = await db
    .from('leaderboard')
    .insert([
    { player_name: playerName, score: finalScore } // 欄位名稱必須與資料表完全一致
    ]);

    if (error) {
        console.error(error.message);
    } else {
        console.log(data);
    }
}

export async function loadLeaderboard(limit) {
const { data, error } = await db
    .from('leaderboard')
    .select('player_name, score')       // 選取要讀取的欄位
    .order('score', { ascending: false }) // 依照分數由高到低排序（false 代表遞減）
    .limit(limit);                            // 只拿前 5 名

    if (error) {
        console.error(error.message);
    } else {
        console.log(data);
        return data;
    }
}

//   async function testDatabase() {
//     await saveScore('測試玩家', 100);
//     await loadLeaderboard();
//   }

//   testDatabase();