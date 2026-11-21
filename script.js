
let currentAnime = "";

// 検索文字
let searchKeyword = "";

// 現在のフィルター
let currentFilter = "すべて";

// お気に入りだけを表示するか
let favoriteOnly = false;

// 現在選択しているジャンル
let currentGenreFilter = "すべて";

// 現在の並び替え方法
let currentSort = "default";

// APIで選択したアニメの情報
let selectedApiAnime = null;


// 最初から登録されているアニメ
const defaultAnime = [
    {
        id: "eupho",
        title: "響け！ユーフォニアム",
        image: "images/eupho.jpg"
    },
    {
        id: "steins",
        title: "STEINS;GATE",
        image: "images/steins.jpg"
    },
    {
        id: "toradora",
        title: "とらドラ！",
        image: "images/toradora.jpg"
    }
];

/* ========================================
   第18回：アニメ作品検索の準備
======================================== */

// 検索候補として使うサンプル作品
const animeCatalog = [
    "響け！ユーフォニアム",
    "STEINS;GATE",
    "とらドラ！",
    "氷菓",
    "宇宙よりも遠い場所",
    "けいおん！",
    "たまこまーけっと",
    "かぐや様は告らせたい"
];


// 登録済みアニメを読み込む
let animeList = JSON.parse(
    localStorage.getItem("animeList")
) || defaultAnime;

// 前回までのデータにもステータスを追加する
animeList.forEach(function (anime) {
    if (!anime.status) {
        anime.status = "視聴済み";
    }
});


// 前回保存した評価を読み込む
let ratings = JSON.parse(
    localStorage.getItem("animeRatings")
) || {};

// アニメ一覧を保存する

/* ========================================
   共通処理
======================================== */

// IDからアニメを探す
function getAnimeById(id) {
    return animeList.find(function (item) {
        return item.id === id;
    });
}

// アニメ一覧を保存する
function saveAnimeList() {
    localStorage.setItem(
        "animeList",
        JSON.stringify(animeList)
    );

    updateDashboard();
}

/* ========================================
   第26回：複数ジャンル対応
======================================== */

// ジャンルを必ず配列として扱う
function getAnimeGenres(anime) {

    const genre = anime.genre;

    // まだジャンルがない場合
    if (!genre || genre === "未設定") {
        return [];
    }


    // すでに配列の場合
    if (Array.isArray(genre)) {
        return [...new Set(
            genre
                .map(item => String(item).trim())
                .filter(item => item !== "" && item !== "未設定")
        )];
    }

    // 以前の文字列データを配列に変換
    return [String(genre).trim()].filter(Boolean);
}

/* 第26回：ジャンル選択欄の共通処理 */

// チェックされているジャンルを取得する
function getSelectedGenres(containerId) {
    const container = document.getElementById(containerId);

    return Array.from(
        container.querySelectorAll('input[type="checkbox"]:checked')
    ).map(input => input.value);
}

// 編集欄に保存済みジャンルを反映する
function setSelectedGenres(containerId, genres) {
    const container = document.getElementById(containerId);

    container.querySelectorAll('input[type="checkbox"]')
        .forEach(input => {
            input.checked = genres.includes(input.value);
        });
}



/* ========================================
   第25回：ジャンル別データ集計
======================================== */

function getGenreStatistics() {

    const genreCounts = {};

    animeList.forEach(anime => {


        const genres = getAnimeGenres(anime);

        genres.forEach(genre => {
            if (!genreCounts[genre]) {
                genreCounts[genre] = 0;
            }

            genreCounts[genre]++;
        });


    });

    // 作品数が多い順に並べ替え
    return Object.entries(genreCounts).sort(
        (a, b) => b[1] - a[1]
    );
}


/* ========================================
   第25回：ジャンルグラフの描画
======================================== */

function renderGenreAnalytics() {

    const chart = document.getElementById("genre-chart");
    const countElement =
        document.getElementById("genre-count");
    const topElement =
        document.getElementById("top-genre");

    // 表示先がない場合は処理しない
    if (!chart || !countElement || !topElement) {
        return;
    }

    const statistics = getGenreStatistics();

    // 前回のグラフを削除
    chart.replaceChildren();

    // ジャンル数
    countElement.textContent = statistics.length;

    // データがない場合
    if (statistics.length === 0) {
        topElement.textContent = "未登録";

        const message = document.createElement("p");
        message.textContent =
            "ジャンルを登録すると分析結果が表示されます。";

        chart.appendChild(message);
        return;
    }


    // 最多ジャンル（同率1位にも対応）
    const maxCount = statistics[0][1];

    const topGenres = statistics
        .filter(([genre, count]) => count === maxCount)
        .map(([genre, count]) => genre);

    topElement.textContent = topGenres.join("・");


    // ジャンルごとにグラフを作成
    statistics.forEach(([genre, count]) => {

        const item = document.createElement("div");
        item.className = "genre-chart-item";

        const header = document.createElement("div");
        header.className = "genre-chart-header";

        const name = document.createElement("span");
        name.textContent = genre;

        const number = document.createElement("span");
        number.textContent = count + "作品";

        header.appendChild(name);
        header.appendChild(number);

        const barBackground =
            document.createElement("div");
        barBackground.className =
            "genre-bar-background";

        const bar = document.createElement("div");
        bar.className = "genre-bar";

        // 最大のジャンルを100%として相対表示
        const percentage = count / maxCount * 100;
        bar.style.width = percentage + "%";

        barBackground.appendChild(bar);

        item.appendChild(header);
        item.appendChild(barBackground);

        chart.appendChild(item);

    });

}



/* ========================================
   アニメ一覧の表示
======================================== */

function renderAnime() {
    const container = document.getElementById("anime-container");

    container.innerHTML = "";

    // 検索とステータスで絞り込む
    const filteredAnime = animeList.filter(function (anime) {

        const matchesSearch = anime.title
            .toLowerCase()
            .includes(searchKeyword.toLowerCase());


        const matchesStatus =
            currentFilter === "すべて" ||
            anime.status === currentFilter;

        // お気に入りフィルター
        const matchesFavorite =
            !favoriteOnly || anime.favorite === true;

        // ジャンルが一致するか確認

        const animeGenres = getAnimeGenres(anime);

        const matchesGenre =
            currentGenreFilter === "すべて" ||
            (
                currentGenreFilter === "未設定"
                    ? animeGenres.length === 0
                    : animeGenres.includes(currentGenreFilter)
            );



        // 3つの条件をすべて満たした作品を表示
        return matchesSearch &&
            matchesStatus &&
            matchesFavorite &&
            matchesGenre;

    });

    // 第14回：選択した方法でアニメを並び替える
    filteredAnime.sort(function (a, b) {

        // タイトル順（日本語対応）
        if (currentSort === "title") {
            return a.title.localeCompare(b.title, "ja");
        }

        // 評価が高い順
        if (currentSort === "rating") {
            const ratingA = Number(ratings[a.id]) || 0;
            const ratingB = Number(ratings[b.id]) || 0;

            return ratingB - ratingA;
        }

        // 視聴日が新しい順
        if (currentSort === "date") {
            const dateA = a.watchDate || "";
            const dateB = b.watchDate || "";

            return dateB.localeCompare(dateA);
        }

        // 登録順（元の並び順）
        return 0;
    });


    // 表示件数
    document.getElementById("anime-count").textContent =
        filteredAnime.length + "作品を表示中";

    // 絞り込んだ作品だけカードを作る
    filteredAnime.forEach(function (anime) {

        const card = document.createElement("div");
        card.className = "anime-card";

        const cover = document.createElement("div");
        cover.className = "anime-cover";

        if (anime.image) {
            const img = document.createElement("img");
            img.src = anime.image;
            img.alt = anime.title;
            cover.appendChild(img);
        } else {
            cover.textContent = "🎬";
        }

        const title = document.createElement("h3");
        title.textContent = anime.title;

        // ステータスを選択できるようにする
        const select = document.createElement("select");
        select.className = "status-select";

        ["視聴済み", "視聴中", "視聴予定"].forEach(function (status) {
            const option = document.createElement("option");
            option.value = status;
            option.textContent = status;
            select.appendChild(option);
        });

        select.value = anime.status;

        select.addEventListener("click", function (event) {
            event.stopPropagation();
        });

        select.addEventListener("change", function (event) {
            event.stopPropagation();

            anime.status = select.value;

            saveAnimeList();
            renderAnime();
        });

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-button";
        deleteButton.textContent = "削除";

        deleteButton.addEventListener("click", function (event) {
            event.stopPropagation();
            deleteAnime(anime.id);
        });

        card.addEventListener("click", function () {
            showDetail(anime.id);
        });

        card.appendChild(cover);
        card.appendChild(title);

        // カードにジャンルを表示する
        const genreTag = document.createElement("span");

        genreTag.className = "anime-genre";


        const genres = getAnimeGenres(anime);

        genreTag.textContent =
            genres.length > 0
                ? genres.join("・")
                : "未設定";


        card.appendChild(genreTag);

        // お気に入り作品にハートを表示
        if (anime.favorite) {
            const favoriteMark = document.createElement("div");
            favoriteMark.className = "favorite-mark";
            favoriteMark.textContent = "♥ お気に入り";

            card.appendChild(favoriteMark);
        }
        card.appendChild(select);
        card.appendChild(deleteButton);

        container.appendChild(card);
    });
    renderGenreAnalytics();
}


/* ========================================
   第22回：タイトルの重複チェック
======================================== */

// 比較しやすい形にタイトルを変換する
function normalizeAnimeTitle(title) {
    return title
        .normalize("NFKC")
        .trim()
        .replace(/\s+/g, "")
        .toLocaleLowerCase("ja");
}


/* ========================================
   アニメの追加・削除
======================================== */

function addAnime(title) {

    // 第22回：すでに登録されているか確認
    const isDuplicate = animeList.some(anime => {
        return normalizeAnimeTitle(anime.title) ===
            normalizeAnimeTitle(title);
    });

    // 重複している場合は登録しない
    if (isDuplicate) {
        alert("このアニメはすでに登録されています！");
        return;
    }


    const apiAnime =
        selectedApiAnime &&
            selectedApiAnime.title === title
            ? selectedApiAnime
            : null;

    const newAnime = {
        id: "anime-" + Date.now() + "-" +
            Math.random().toString(36).slice(2, 8),

        title: title,

        image: apiAnime ? apiAnime.image : "",

        year: apiAnime ? apiAnime.year : null,

        totalEpisodes:
            apiAnime ? apiAnime.totalEpisodes : 0,

        watchedEpisodes: 0,

        status: "視聴予定",


        genre: getSelectedGenres("new-anime-genres"),


        memo: "",
        watchDate: "",
        favorite: false
    };

    animeList.push(newAnime);

    // 新規登録後はジャンルの選択をリセット
    setSelectedGenres("new-anime-genres", []);


    // APIの選択情報をリセット
    selectedApiAnime = null;

    saveAnimeList();
    renderAnime();
    updateAnimeSuggestions();
}


// アニメを削除する
function deleteAnime(id) {
    const anime = getAnimeById(id);


    if (!anime) {
        return;
    }

    const confirmed = confirm(
        anime.title + "を削除しますか？"
    );

    if (!confirmed) {
        return;
    }

    animeList = animeList.filter(function (item) {
        return item.id !== id;
    });

    delete ratings[id];

    localStorage.setItem(
        "animeRatings",
        JSON.stringify(ratings)
    );

    if (currentAnime === id) {
        closeDetail();
    }

    saveAnimeList();
    renderAnime();
    updateAnimeSuggestions();
}

// アニメの詳細を表示する

function showDetail(id) {

    const anime = getAnimeById(id);


    if (!anime) {
        return;
    }

    currentAnime = id;

    // 作品タイトル
    document.getElementById("detail-title").textContent =
        anime.title;

    // 編集欄に現在の作品情報を表示
    document.getElementById("edit-anime-title").value =
        anime.title;

    // 保存済みのジャンルにチェックを付ける
    setSelectedGenres(
        "edit-anime-genres",
        getAnimeGenres(anime)
    );



    document.getElementById("edit-anime-image").value =
        (anime.image || "").startsWith("data:image/")
            ? ""
            : (anime.image || "");

    // 前の作品で選んだファイルをリセット
    document.getElementById("image-file").value = "";

    document.getElementById("image-message").textContent = "";


    // 前回のメッセージを消す
    document.getElementById("edit-anime-message").textContent =
        "";


    // 視聴ステータス
    document.getElementById("detail-status").textContent =
        anime.status || "視聴済み";

    // 第21回：放送年を表示
    document.getElementById("detail-year").textContent =
        anime.year
            ? "放送年：" + anime.year + "年"
            : "放送年：未設定";


    // 保存されている視聴日と感想を読み込む
    document.getElementById("watch-date").value =
        anime.watchDate || "";

    document.getElementById("anime-memo").value =
        anime.memo || "";

    // 保存された視聴進捗を表示
    document.getElementById("watched-episodes").value =
        anime.watchedEpisodes ?? 0;

    document.getElementById("total-episodes").value =
        anime.totalEpisodes ?? 0;

    // 進捗バーを更新
    updateEpisodeProgress();


    // お気に入りボタンを更新
    updateFavoriteButton();

    // 保存メッセージを初期化
    document.getElementById("diary-message").textContent = "";

    // 詳細画面を表示
    document.getElementById("detail-panel").style.display =
        "block";

    updateRatingDisplay();
}


// 詳細を閉じる
function closeDetail() {
    document.getElementById("detail-panel").style.display =
        "none";

    currentAnime = "";
}

// アニメを評価する
function setRating(star) {
    if (!currentAnime) {
        return;
    }

    ratings[currentAnime] = star;

    localStorage.setItem(
        "animeRatings",
        JSON.stringify(ratings)
    );

    updateRatingDisplay();
    updateDashboard();
}

// 評価の表示を更新する
function updateRatingDisplay() {
    const rating = ratings[currentAnime] || 0;

    const result = document.getElementById("rating-result");

    if (rating === 0) {
        result.textContent = "まだ評価されていません";
    } else {
        result.textContent =
            "あなたの評価：" + rating + " / 5";
    }

    const buttons = document.querySelectorAll(
        ".rating-buttons button"
    );

    buttons.forEach(function (button, index) {
        if (index < rating) {
            button.classList.add("selected");
        } else {
            button.classList.remove("selected");
        }
    });
}

// 登録フォームの送信イベント
document.getElementById("anime-form").addEventListener(
    "submit",
    function (event) {
        event.preventDefault();

        const input = document.getElementById("anime-title");
        const title = input.value.trim();

        if (title === "") {
            return;
        }

        addAnime(title);

        // 入力欄を空にする
        input.value = "";
    }
);

// 最初にカードを表示
renderAnime();

// 検索欄に文字が入力されたとき
document.getElementById("search-input").addEventListener(
    "input",
    function (event) {
        searchKeyword = event.target.value;
        renderAnime();
    }
);

// フィルターボタンを押したとき
document.querySelectorAll(".filter-button").forEach(
    function (button) {

        button.addEventListener("click", function () {

            currentFilter = button.dataset.status;

            // 選択中のボタンを切り替える
            document.querySelectorAll(".filter-button").forEach(
                function (b) {
                    b.classList.remove("active");
                }
            );

            button.classList.add("active");

            renderAnime();
        });
    }
);

/* ========================================
   ダッシュボード・統計
======================================== */
function updateDashboard() {

    // 登録作品数
    const total = animeList.length;

    // 視聴ステータスごとの作品数
    const completed = animeList.filter(function (anime) {
        return (anime.status || "視聴済み") === "視聴済み";
    }).length;

    const watching = animeList.filter(function (anime) {
        return anime.status === "視聴中";
    }).length;

    const planned = animeList.filter(function (anime) {
        return anime.status === "視聴予定";
    }).length;

    // 画面に表示
    document.getElementById("total-count").textContent = total;
    document.getElementById("completed-count").textContent = completed;
    document.getElementById("watching-count").textContent = watching;
    document.getElementById("planned-count").textContent = planned;

    // 評価された作品だけ取り出す
    const ratedAnime = animeList.filter(function (anime) {
        return Number(ratings[anime.id]) >= 1 &&
            Number(ratings[anime.id]) <= 5;
    });

    // 平均評価を計算
    if (ratedAnime.length === 0) {
        document.getElementById("average-rating").textContent =
            "未評価";
    } else {
        let sum = 0;

        ratedAnime.forEach(function (anime) {
            sum += Number(ratings[anime.id]);
        });

        const average = sum / ratedAnime.length;

        document.getElementById("average-rating").textContent =
            average.toFixed(1) + " / 5.0";
    }

    // ランキングを作成
    const ranking = [...ratedAnime].sort(function (a, b) {
        return Number(ratings[b.id]) - Number(ratings[a.id]);
    });

    const rankingList = document.getElementById("ranking-list");
    rankingList.innerHTML = "";

    ranking.slice(0, 5).forEach(function (anime) {
        const li = document.createElement("li");

        li.textContent =
            anime.title + "　★ " + ratings[anime.id];

        rankingList.appendChild(li);
    });

    if (ranking.length === 0) {
        const li = document.createElement("li");
        li.textContent = "まだ評価された作品がありません";
        rankingList.appendChild(li);
    }
}

// ページを開いたときに統計を表示
updateDashboard();


/* ========================================
   画面切り替え
======================================== */

function switchPage(pageName) {

    // すべての画面を非表示にする
    document.querySelectorAll(".page").forEach(function (page) {
        page.classList.remove("active");
    });

    // 選択された画面を表示する
    document.getElementById("page-" + pageName)
        .classList.add("active");

    // ナビゲーションボタンの表示を更新
    document.querySelectorAll(".nav-button").forEach(function (button) {

        if (button.dataset.page === pageName) {
            button.classList.add("active");
        } else {
            button.classList.remove("active");
        }

    });

    // マイページの統計を更新
    if (pageName === "mypage") {
        updateDashboard();
    }

    // ページの先頭に戻る
    window.scrollTo(0, 0);
}


// ナビゲーションボタンにクリック処理を追加
document.querySelectorAll(".nav-button").forEach(function (button) {
    button.addEventListener("click", function () {
        switchPage(button.dataset.page);
    });
});

/* ========================================
   日記・お気に入り管理
======================================== */
function saveDiary() {

    const anime = getAnimeById(currentAnime);
    if (!anime) {
        return;
    }

    // 入力された内容を作品データに保存
    anime.watchDate =
        document.getElementById("watch-date").value;

    anime.memo =
        document.getElementById("anime-memo").value;

    // 視聴進捗を保存
    const watched = Number(
        document.getElementById("watched-episodes").value
    );

    const total = Number(
        document.getElementById("total-episodes").value
    );

    // 正しい話数か確認する
    if (!Number.isInteger(watched) ||
        !Number.isInteger(total) ||
        watched < 0 ||
        total < 0 ||
        (total > 0 && watched > total) ||
        (total === 0 && watched > 0)) {

        document.getElementById("diary-message").textContent =
            "話数を正しく入力してください。";

        return;
    }

    anime.watchedEpisodes = watched;
    anime.totalEpisodes = total;


    // localStorageに保存
    saveAnimeList();

    document.getElementById("diary-message").textContent =
        "日記を保存しました！";
}


// お気に入りを切り替える
function toggleFavorite() {

    const anime = getAnimeById(currentAnime);

    if (!anime) {
        return;
    }

    // trueとfalseを切り替える
    anime.favorite = !anime.favorite;

    saveAnimeList();

    updateFavoriteButton();

    // アニメ一覧の表示も更新する
    renderAnime();
}


// お気に入りボタンの見た目を更新
function updateFavoriteButton() {

    const anime = getAnimeById(currentAnime);

    if (!anime) {
        return;
    }

    const button =
        document.getElementById("favorite-button");

    if (anime.favorite) {
        button.textContent = "♥ お気に入り登録済み";
        button.classList.add("is-favorite");
    } else {
        button.textContent = "♡ お気に入りに登録";
        button.classList.remove("is-favorite");
    }
}

// お気に入りフィルターを切り替える
function toggleFavoriteFilter() {

    favoriteOnly = !favoriteOnly;

    const button = document.getElementById(
        "favorite-filter-button"
    );

    if (favoriteOnly) {
        button.textContent = "♥ お気に入り表示中";
        button.classList.add("active");
    } else {
        button.textContent = "♡ お気に入りのみ表示";
        button.classList.remove("active");
    }

    renderAnime();
}

// 作品情報を編集して保存する
function saveAnimeEdit() {

    // 今開いている作品を探す
    const anime = getAnimeById(currentAnime);

    if (!anime) {
        return;
    }


    // 入力内容を取得
    const newTitle = document
        .getElementById("edit-anime-title")
        .value.trim();

    const imagePath = document
        .getElementById("edit-anime-image")
        .value.trim();

    const newImage = imagePath || anime.image || "";



    // タイトルが空欄なら保存しない
    if (newTitle === "") {
        document.getElementById("edit-anime-message")
            .textContent = "タイトルを入力してください";
        return;
    }

    // 作品情報を変更
    anime.title = newTitle;
    anime.image = newImage;
    // ジャンルも更新する
    anime.genre = getSelectedGenres("edit-anime-genres");


    // 保存
    saveAnimeList();

    // 詳細画面のタイトルを更新
    document.getElementById("detail-title").textContent =
        anime.title;

    // アニメ一覧を更新
    renderAnime();

    // 完了メッセージ
    document.getElementById("edit-anime-message")
        .textContent = "作品情報を更新しました！";
}

/* ========================================
   第13回：画像ファイルの登録
======================================== */

document.getElementById("image-file").addEventListener(
    "change",
    function (event) {

        const file = event.target.files[0];

        if (!file) {
            return;
        }

        const message =
            document.getElementById("image-message");

        // 画像形式を確認
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {
            message.textContent =
                "JPG・PNG・WebPの画像を選んでください。";
            event.target.value = "";
            return;
        }

        // 大きすぎるファイルは読み込まない
        if (file.size > 10 * 1024 * 1024) {
            message.textContent =
                "10MB以下の画像を選んでください。";
            event.target.value = "";
            return;
        }

        // 画像選択時の作品IDを覚える
        const selectedAnimeId = currentAnime;

        if (!selectedAnimeId) {
            return;
        }

        message.textContent = "画像を読み込み中...";

        const reader = new FileReader();

        reader.onload = function () {

            const img = new Image();

            img.onload = function () {

                // 縮小する倍率を計算
                const scale = Math.min(
                    1,
                    480 / img.width,
                    720 / img.height
                );

                const canvas =
                    document.createElement("canvas");

                canvas.width =
                    Math.max(1, Math.round(img.width * scale));

                canvas.height =
                    Math.max(1, Math.round(img.height * scale));

                const ctx = canvas.getContext("2d");

                // 背景を塗る
                ctx.fillStyle = "#0a1020";
                ctx.fillRect(
                    0, 0,
                    canvas.width,
                    canvas.height
                );

                // 画像を縮小して描画
                ctx.drawImage(
                    img,
                    0, 0,
                    canvas.width,
                    canvas.height
                );

                // 保存用の画像データに変換
                const imageData =
                    canvas.toDataURL("image/jpeg", 0.72);

                // 対象のアニメを探す
                const anime =
                    getAnimeById(selectedAnimeId);

                if (!anime) {
                    return;
                }

                const oldImage = anime.image;

                anime.image = imageData;

                try {
                    // 画像データを保存
                    saveAnimeList();

                    // 一覧を更新
                    renderAnime();

                    if (currentAnime === selectedAnimeId) {
                        document.getElementById(
                            "edit-anime-image"
                        ).value = "";

                        message.textContent =
                            "画像を登録しました！";
                    }

                } catch (error) {

                    // 保存に失敗したら元に戻す
                    anime.image = oldImage;

                    message.textContent =
                        "保存容量が足りません。画像を減らすか、別の保存方法が必要です。";

                    console.error(error);
                }
            };

            img.onerror = function () {
                message.textContent =
                    "画像を読み込めませんでした。";
            };

            img.src = reader.result;
        };

        reader.onerror = function () {
            message.textContent =
                "ファイルの読み込みに失敗しました。";
        };

        reader.readAsDataURL(file);
    }
);

/* ========================================
   第14回：並び替えイベント
======================================== */

document.getElementById("sort-select").addEventListener(
    "change",
    function (event) {

        // 選択された並び替え方法を記録
        currentSort = event.target.value;

        // アニメ一覧をもう一度表示
        renderAnime();
    }
);


/* ========================================
   第15回：ジャンルフィルター
======================================== */

document.getElementById("genre-filter").addEventListener(
    "change",
    function (event) {

        // 選択されたジャンルを記録
        currentGenreFilter = event.target.value;

        // アニメ一覧を更新
        renderAnime();
    }
);

/* ========================================
   第16回：視聴進捗
======================================== */

function updateEpisodeProgress() {

    const watched = Number(
        document.getElementById("watched-episodes").value
    );

    const total = Number(
        document.getElementById("total-episodes").value
    );

    const text = document.getElementById(
        "episode-progress-text"
    );

    const bar = document.getElementById(
        "episode-progress-bar"
    );

    if (total <= 0) {
        text.textContent = "進捗：全話数が未設定です";
        bar.style.width = "0%";
        return;
    }

    const percent = Math.min(
        100,
        Math.round((watched / total) * 100)
    );

    text.textContent =
        watched + " / " + total + "話（" + percent + "%）";

    bar.style.width = percent + "%";
}

document.getElementById("watched-episodes")
    .addEventListener("input", updateEpisodeProgress);

document.getElementById("total-episodes")
    .addEventListener("input", updateEpisodeProgress);

/* ========================================
   第17回：バックアップ・復元
======================================== */

// バックアップを作成する
function exportBackup() {

    // 保存するデータを1つにまとめる
    const backupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        animeList: animeList,
        ratings: ratings
    };

    // JSON形式の文字列に変換
    const json = JSON.stringify(
        backupData,
        null,
        2
    );

    // ダウンロード用のファイルを作成
    const blob = new Blob(
        [json],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    const today = new Date()
        .toLocaleDateString("sv-SE");

    link.href = url;
    link.download =
        "anime-diary-backup-" + today + ".json";

    document.body.appendChild(link);

    link.click();
    link.remove();

    setTimeout(function () {
        URL.revokeObjectURL(url);
    }, 1000);

    document.getElementById("backup-message")
        .textContent =
        "バックアップのダウンロードを開始しました！";
}

// ダウンロードボタンに処理を設定
document.getElementById("export-button")
    .addEventListener("click", exportBackup);

// バックアップデータが正しいか確認
function isValidBackup(data) {

    if (!data || typeof data !== "object" ||
        Array.isArray(data) ||
        data.version !== 1 ||
        !Array.isArray(data.animeList) ||
        !data.ratings ||
        typeof data.ratings !== "object" ||
        Array.isArray(data.ratings)) {
        return false;
    }

    const ids = new Set();

    // アニメデータを確認
    for (const anime of data.animeList) {

        if (!anime ||
            typeof anime !== "object" ||
            Array.isArray(anime) ||
            typeof anime.id !== "string" ||
            anime.id.length === 0 ||
            typeof anime.title !== "string" ||
            anime.title.length === 0 ||
            (anime.image !== undefined &&
                typeof anime.image !== "string") ||
            ids.has(anime.id)) {
            return false;
        }

        ids.add(anime.id);
    }

    // 評価データを確認
    for (const [id, rating] of Object.entries(data.ratings)) {
        if (!ids.has(id) ||
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 5) {
            return false;
        }
    }

    return true;
}


// バックアップから復元する
async function importBackup() {

    const fileInput =
        document.getElementById("import-file");

    const message =
        document.getElementById("backup-message");

    const file = fileInput.files[0];

    if (!file) {
        message.textContent =
            "バックアップファイルを選んでください。";
        return;
    }

    // 大きすぎるファイルを防ぐ
    if (file.size > 20 * 1024 * 1024) {
        message.textContent =
            "20MB以下のJSONファイルを選んでください。";
        return;
    }

    let backupData;

    try {
        const text = await file.text();
        backupData = JSON.parse(text);
    } catch (error) {
        message.textContent =
            "JSONファイルを読み込めませんでした。";
        return;
    }

    // データの形式を確認
    if (!isValidBackup(backupData)) {
        message.textContent =
            "対応していないバックアップファイルです。";
        return;
    }

    // 本当に上書きするか確認
    const confirmed = confirm(
        "現在のアニメ記録と評価を上書きします。\n" +
        "復元前のバックアップは作成しましたか？\n\n" +
        "復元を実行しますか？"
    );

    if (!confirmed) {
        return;
    }

    // 上書き前のデータを一時的に覚える
    const oldAnimeList =
        localStorage.getItem("animeList");

    const oldRatings =
        localStorage.getItem("animeRatings");

    try {

        // アニメ記録を保存
        localStorage.setItem(
            "animeList",
            JSON.stringify(backupData.animeList)
        );

        // 評価を保存
        localStorage.setItem(
            "animeRatings",
            JSON.stringify(backupData.ratings)
        );

    } catch (error) {

        // 保存に失敗した場合は元の値に戻す
        try {
            if (oldAnimeList === null) {
                localStorage.removeItem("animeList");
            } else {
                localStorage.setItem(
                    "animeList", oldAnimeList
                );
            }

            if (oldRatings === null) {
                localStorage.removeItem("animeRatings");
            } else {
                localStorage.setItem(
                    "animeRatings", oldRatings
                );
            }
        } catch (restoreError) {
            console.error(
                "元データの復旧にも失敗しました",
                restoreError
            );
        }

        message.textContent =
            "保存に失敗しました。容量やブラウザ設定を確認してください。";

        console.error(error);
        return;
    }

    // 復元したデータでサイトを再起動
    alert("復元が完了しました！ページを更新します。");

    location.reload();
}


// 復元ボタンに処理を設定
document.getElementById("import-button")
    .addEventListener("click", importBackup);

/* ========================================
   第18回：検索候補の表示
======================================== */

function updateAnimeSuggestions() {

    const datalist = document.getElementById(
        "anime-suggestions"
    );

    // 既存の候補をクリア
    datalist.innerHTML = "";

    // 登録済み作品のタイトルも候補に追加
    const registeredTitles = animeList.map(function (anime) {
        return anime.title;
    });

    // 2つの作品一覧をまとめる
    const allTitles = [
        ...animeCatalog,
        ...registeredTitles
    ];

    // 重複する作品名を取り除く
    const uniqueTitles = [...new Set(allTitles)];

    // 候補を1つずつ作成
    uniqueTitles.forEach(function (title) {

        const option = document.createElement("option");

        option.value = title;

        datalist.appendChild(option);
    });
}

// 最初に検索候補を作成
updateAnimeSuggestions();

/* ========================================
   第24回：API情報で登録済み作品を補完
======================================== */

function updateRegisteredAnimeFromAPI(apiAnime, animeTitle, imageUrl) {

    // ① ライブラリから同じタイトルの作品を探す
    const registeredAnime = animeList.find(item =>
        normalizeAnimeTitle(item.title) ===
        normalizeAnimeTitle(animeTitle)
    );

    if (!registeredAnime) {
        alert("登録済みの作品が見つかりません。");
        return;
    }

    // ② 更新候補を用意する
    const updates = {};
    const changes = [];

    // 画像がない場合だけ追加
    if (!registeredAnime.image && imageUrl) {
        updates.image = imageUrl;
        changes.push("表紙画像");
    }

    // 放送年がない場合だけ追加
    if (!registeredAnime.year && apiAnime.seasonYear) {
        updates.year = apiAnime.seasonYear;
        changes.push("放送年：" + apiAnime.seasonYear + "年");
    }

    // 全話数がない場合だけ追加
    if (
        !(registeredAnime.totalEpisodes > 0) &&
        apiAnime.episodes > 0
    ) {
        updates.totalEpisodes = apiAnime.episodes;
        changes.push("全話数：" + apiAnime.episodes + "話");
    }

    // ③ 更新できる情報がない場合
    if (changes.length === 0) {
        alert("追加できる新しい作品情報はありません。");
        return;
    }

    // ④ 更新内容を確認
    const confirmed = confirm(
        "「" + registeredAnime.title + "」を更新しますか？\n\n" +
        "追加する情報：\n" +
        changes.map(item => "・" + item).join("\n") +
        "\n\n評価・感想・視聴記録は変更されません。"
    );

    if (!confirmed) {
        return;
    }

    // ⑤ 更新内容を反映
    Object.assign(registeredAnime, updates);

    // ⑥ ライブラリに保存して再表示
    localStorage.setItem(
        "animeList",
        JSON.stringify(animeList)
    );

    renderAnime();

    alert("作品情報を更新しました！");
}


/* ========================================
   第19回：外部APIでアニメ検索
======================================== */

// APIでアニメを検索する
async function searchAnimeAPI() {

    const input =
        document.getElementById("api-search-input");

    const message =
        document.getElementById("api-search-message");

    const results =
        document.getElementById("api-search-results");

    const keyword = input.value.trim();

    // 入力が空なら検索しない
    if (keyword === "") {
        message.textContent =
            "検索するアニメ名を入力してください。";
        return;
    }

    // 前の検索結果を消す
    results.replaceChildren();

    message.textContent = "アニメを検索中...";

    const button =
        document.getElementById("api-search-button");

    button.disabled = true;

    try {

        // アニメ情報を外部APIから取得
        const query = `
    query ($search: String) {
        Page(page: 1, perPage: 5) {
            media(search: $search, type: ANIME) {
                id
                title {
                    romaji
                    native
                }
                coverImage {
                    large
                }
                seasonYear
                format
                episodes
            }
        }
    }
`;

        const response = await fetch(
            "https://graphql.anilist.co",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    query: query,
                    variables: {
                        search: keyword
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error("APIエラー：" + response.status);
        }

        const data = await response.json();

        console.log("AniList検索結果", data);



        const animeResults = data.data?.Page?.media;


        if (!Array.isArray(animeResults)) {
            throw new Error("検索結果の形式が違います");
        }

        if (animeResults.length === 0) {
            message.textContent =
                "該当するアニメが見つかりませんでした。";
            return;
        }

        message.textContent =
            animeResults.length + "件の候補が見つかりました！";

        // 検索結果をカードとして表示
        animeResults.forEach(function (anime) {

            const card = document.createElement("div");
            card.className = "api-result-card";

            // ポスター画像

            const imageUrl = anime.coverImage?.large;


            if (imageUrl) {
                const image = document.createElement("img");

                image.src = imageUrl;
                image.alt = anime.title || "アニメの表紙";

                card.appendChild(image);
            }

            // 作品情報を入れる場所
            const info = document.createElement("div");
            info.className = "api-result-info";

            const title = document.createElement("h4");


            const animeTitle =
                anime.title?.native ||
                anime.title?.romaji ||
                "タイトル不明";


            title.textContent = animeTitle;

            const isRegistered = animeList.some(item =>
                normalizeAnimeTitle(item.title) ===
                normalizeAnimeTitle(animeTitle)
            );


            const details = document.createElement("p");


            details.textContent =
                "放送年：" + (anime.seasonYear || "不明") +
                " / 形式：" + (anime.format || "不明");


            // 作品を選択するボタン
            const selectButton =
                document.createElement("button");

            selectButton.type = "button";
            selectButton.className = "api-select-button";

            selectButton.textContent =
                "この作品を選択";


            if (isRegistered) {
                selectButton.textContent = "API情報で補完";
                selectButton.disabled = false;
                selectButton.classList.add("api-registered");
            }


            selectButton.addEventListener(
                "click",
                function () {

                    // 登録済み作品ならAPI情報の補完処理へ
                    if (isRegistered) {
                        updateRegisteredAnimeFromAPI(
                            anime,
                            animeTitle,
                            imageUrl
                        );
                        return;
                    }


                    // 既存のアニメ登録フォームに入力
                    const titleInput =
                        document.getElementById(
                            "anime-title"
                        );

                    titleInput.value = animeTitle;

                    // 選択した作品のタイトルと画像URLを覚える
                    selectedApiAnime = {
                        title: animeTitle,
                        image: imageUrl || "",
                        year: anime.seasonYear || null,
                        totalEpisodes: anime.episodes || 0
                    };

                    // 入力欄に移動
                    titleInput.focus();

                    message.textContent =
                        "作品を選択しました！" +
                        "ジャンルを確認して登録してください。";
                }
            );

            info.appendChild(title);
            info.appendChild(details);
            info.appendChild(selectButton);

            card.appendChild(info);
            results.appendChild(card);
        });

    } catch (error) {

        console.error("アニメ検索エラー", error);

        message.textContent =
            "検索エラー：" + error.name +
            " / " + error.message;

    } finally {

        // 検索が終わったらボタンを戻す
        button.disabled = false;
    }
}


// 検索ボタンを押したとき
document.getElementById("api-search-button")
    .addEventListener("click", searchAnimeAPI);


// Enterキーでも検索できるようにする
document.getElementById("api-search-input")
    .addEventListener("keydown", function (event) {

        if (event.key === "Enter") {
            event.preventDefault();
            searchAnimeAPI();
        }
    });

/* ========================================
   第20回：手入力時のAPI選択解除
======================================== */

document.getElementById("anime-title")
    .addEventListener("input", function () {

        // 手入力されたらAPIの選択情報を解除
        selectedApiAnime = null;
    });
