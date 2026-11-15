'use strict';

// Rules run in order. Match the feature path before matching shared layers.
const accountBook = [
    ['analysis','소비 분석',/analysis|spending/], ['receipts','영수증',/receipt/],
    ['transactions','거래',/transaction/], ['fixed-costs','고정비',/fixed.?cost/],
    ['members','공유와 멤버',/invitation|member/], ['reports','통계와 목표',/monthly.?goal|chart|summary/],
    ['categories','분류',/categor/], ['common','가계부 공통',/\bcommon\b/],
];
const learning = [
    ['writing','작문',/writing|curated/], ['speaking','말하기',/speaking/], ['listening','듣기',/listening/],
    ['level','레벨 테스트',/level.?test|\blevel\b/], ['practice','읽기와 어휘 연습',/practice|reading|vocabulary/],
    ['settings','설정과 키워드',/setting|keyword|profile/], ['web-ai','웹 AI 계획',/web.?ai/],
    ['progress','학습 진행과 결과',/growth|history|activity|overview|dashboard|result.?journal/],
    ['common','학습 공통',/\b(common|support)\b/],
];
const frontFeatures = [
    ['account-book','가계부',/account.?books?|receipt/,accountBook],
    ['learning','언어 학습',/language.?learning|\blearning\b/,learning],
    ['novel','소설',/novels?|\/episode\/|episode(viewer|header)|readerpager|dictregistration/], ['voice','음성과 번역',/voice|translation|translate/],
    ['chat','채팅',/chat|\b(open|room.?management|invitations)\b/],
    ['account','계정과 인증',/auth|account.?deletion|password.?reset|sign.?in|register|\/login\b|\/account\b|\/identity\.ts/],
    ['social','친구와 프로필',/friend|profile|user.?search|user.?blocks|\/blocks\b|report/],
    ['support','고객 지원과 알림',/support|notification|push/],
    ['settings','설정과 관리',/setting|currency/], ['docs','사용자 가이드',/\b(docs|guide)\b/],
    ['navigation','서비스 탐색',/\b(navigation|services|service.?select|tabs)\b/],
];
const unityFeatures = [
    ['diagnostics','진단과 자동화',/automation|diagnostic|evidence|contractcheck|^test/],
    ['accounts','계정과 캐릭터 생성',/account|charactercreation|characterappearance|rpgidentity/],
    ['dungeons','던전과 보스',/dungeon|boss|ruins|raid/], ['party','파티와 협동',/party|fieldcoop/],
    ['equipment','장비·외형·인벤토리',/equipment|cosmetic|inventory|clothing|wings|mount|shop/],
    ['progress','성장과 직업',/skill|class|progression|achievement|reward|experience/],
    ['quests','퀘스트와 월드 이벤트',/quest|fieldadventure|bounty|gatedefense/],
    ['combat','전투와 몬스터',/combat|enemy|enemies|magic|buff|vitals|health/],
    ['network','접속과 통신',/network|connection|interpolation|protocol|transport|socket/],
    ['world','월드와 이동',/world|terrain|climb|environment|village|map|navigation|avatar/],
    ['screens','화면과 연출',/hud|ui\b|presentation|assets|camera|visual/],
    ['storage','캐릭터 저장',/characterrepository|characterstore|characterstorage|persistence/],
    ['common','공통',/prototypeapp|asynccommand|simulationmath|simulationcontext|jsoncodec|^(program|contracts)\.cs$/],
];
const unrealFeatures = [
    ['market','교환과 시장',/exchange|market/], ['community','친구와 길드',/community|guild|friend/],
    ['parties','파티와 원정',/party|expedition|dungeon|encounter|gamemoderesults/],
    ['towns','마을과 이동',/town|sunbrook/], ['inventory','장비와 인벤토리',/inventory|equipment|workshop|loot/],
    ['online','온라인 접속',/online|fablebackend\b|gameinstance/],
    ['combat','전투와 몬스터',/combat|enemy|projectile|character\b/],
    ['progress','직업과 진행',/class|adventure|story|charactersummary|charactercontracts|characterstore/],
    ['activities','생활과 외형',/activity|avatar|expansion/],
    ['storage','프로필과 저장',/sqlstore|profile|savegame/], ['screens','화면과 UI',/hud|widget/],
    ['world','월드와 필드',/fableworld|moonwell/], ['framework','게임 모드와 플레이어 상태',/fablegamemode|fablegamestate|fableplayer(controller|state)|fablerpgtypes/],
    ['common','공통',/\.build\.cs|^(program|backendoptions|contracts)\.cs$/],
];

const repositories = {
    translacat: [
        ['be','BE · 백엔드','백엔드',[
            ['account-book','가계부',/\baccountbook\b/,accountBook],
            ['learning','언어 학습',/languagelearning/,learning],
            ['chat','채팅 연동',/\/chat\/|chatgateway|chatcore/],
            ['novel','소설과 게이트웨이',/\/novel(?:gateway)?\/|scraping/],
            ['voice','음성',/\/voice\/|voicehistory/], ['currency','통화와 환율',/currency|exchangerate/],
            ['account','계정과 인증',/\/domain\/user\/(auth|deletion|pushinstallation)\//],
            ['social','사용자·프로필·친구',/\/domain\/user\//], ['support','고객 지원과 알림',/\/support\//],
            ['language','언어와 후리가나',/\/domain\/common\/language\/|\/japanese\//],
            ['integrations','외부 서비스 연동',/\/infrastructure\/client\/|\/infrastructure\/storage\//],
            ['common','공통',/\/global\/|\/domain\/common\/|translacatapplication/],
        ]],
        ['fe','FE · 웹','웹',[...frontFeatures,['common','공통',/^src\/(lib|utils|types|hooks|constants|i18n)\/|\/components\/(common|layout)\/|\blayout\.tsx|\/proxy\.ts|languagecatalog|\/ruby\.ts/]]],
        ['ll','LL · 언어 학습','언어 학습',[
            ...learning.filter(([id])=>id!=='common'), ['account','학습자와 계정 탈퇴',/learner|accountdeletion/],
            ['common','공통',/\/shared\/|\/bootstrap\/|\/application\.kt/],
        ]],
        ['chat','CHAT · 채팅','채팅',[
            ['open-chat','오픈 채팅',/openchat|openroom|openinvitation|openmembership|openmoderation|profileimage/],
            ['ai','AI 채팅과 번역',/aimember|(?:^|\/)(ai|aimanagement|translation)\/|chatai|translation/],
            ['notifications','알림과 푸시',/notification|push/], ['safety','신고·차단·탈퇴',/safety|audit|block|report|accountdeletion|accountwritefence/],
            ['realtime','실시간 연결과 접속 상태',/realtime|presence|(?:^|\/)redis\/|redischat/],
            ['messages','메시지와 읽음',/messaging|chatmessage|(?:^|\/)read\/|chat(?:room)?read|readtransaction|readcursor/],
            ['rooms','채팅방과 멤버십',/(?:^|\/)rooms\/|membership|chatrooms|chatroomconfiguration|chatroomstore|chatroomhttp/],
            ['language','대화 언어 설정',/(?:^|\/)language\/|chatlanguage|memberlanguage/],
            ['common','공통',/authentication|configuration|(?:^|\/)(runtime|core|migrations)\/|program\.cs|healthcontroller|database|dbcontext/],
        ]],
        ['ai','AI · 모델 서비스','AI',[
            ['receipts','영수증 분석',/receipt/], ['spending','소비 분석',/spending/],
            ['voice','음성 처리',/voice|speech|\/stt\.py/], ['learning','학습 지원',/language_learning/],
            ['translation','번역',/translation|translate/], ['models','모델 실행과 공급자',/\/ai\/|model.*execution/],
            ['common','공통',/\/common\/|\/core\/|\/schemas\/|main\.py|dependencies\.py|\/services\//],
        ]],
        ['mobile','MOBILE · 모바일','모바일',[
            ...frontFeatures,['common','공통',/^src\/(api|config|providers|realtime|ui)\/|\/(?:_layout|\+not-found)\.tsx|\/features\/services\//],
        ]],
        ['novel','NOVEL · 소설','소설',[
            ['catalog','카탈로그와 작품',/catalog/], ['audio','오디오',/audio/],
            ['translation','번역과 모델 실행',/translation|segmenter|\/ai\/|scheduler|benchmark/],
            ['reader','회차와 독서',/reader|episode|sourcetext|\/source\/|novel(query|command|facade|controller)/],
            ['storage','저장과 마이그레이션',/persistence|repository|archive/],
            ['common','공통',/internal(?:auth|api)|trace|error|application\.java|novelproblem|telemetry|executionsettings|\/http\/|novelports|validationfixture/],
        ]],
    ],
    unity: [
        ['client','Unity 클라이언트','Unity 클라이언트',unityFeatures],
        ['game-server','게임 서버','게임 서버',unityFeatures],
        ['character-store','캐릭터 저장 API','캐릭터 저장 API',unityFeatures],
        ['shared','공유 패키지','공유 규칙과 통신',unityFeatures],
    ],
    unreal: [
        ['game','Unreal 게임','Unreal 게임',unrealFeatures],
        ['backend','중앙 저장 API','중앙 저장 API',unrealFeatures],
    ],
};

function buildFunctionCatalog(files, functions) {
    const projects = new Map();
    const groupsByFile = new Map();
    for (const [project, definitions] of Object.entries(repositories)) {
        const groups = new Map(definitions.map(([id, label, source, rules])=>[id,{id,label,source,rules,entries:[],features:new Map()}]));
        projects.set(project, groups);
    }
    const bySource = new Map([...projects].flatMap(([project, groups])=>[...groups.values()].map(group=>[`${project}/${group.source}`, group])));
    for (const entry of functions) {
        const file = files.get(entry[0].split('-')[0]);
        let location = groupsByFile.get(file.id);
        if (!location) {
            const repo = bySource.get(`${file.project}/${file.service}`);
            if (!repo) throw new Error(`함수 분류에 저장소가 없습니다. ${file.project}/${file.service}`);
            let relative = file.path.toLowerCase();
            if (file.project==='unity'||file.project==='unreal') relative=relative.slice(relative.lastIndexOf('/')+1);
            if (repo.id==='chat') relative=relative.slice(relative.indexOf('/')+1);
            const shared = (repo.id==='ll' && /\/shared\//.test(relative)) || (repo.id==='chat' && /(?:^|\/)(authentication|serviceauthentication|migrations)\//.test(relative));
            const [id, label,, sections] = (shared ? ['common','공통'] : repo.rules.find(rule=>rule[2].test(relative))) ?? ['other','기타 구현'];
            if (!repo.features.has(id)) repo.features.set(id,{id,label,entries:[],sections:new Map()});
            const feature=repo.features.get(id);
            const [sectionId, sectionLabel] = sections?.find(rule=>rule[2].test(relative)) ?? ['overview','기본 기능'];
            if (sections && !feature.sections.has(sectionId)) feature.sections.set(sectionId,{id:sectionId,label:sectionLabel,entries:[]});
            location={repo,feature,section:feature.sections.get(sectionId)};
            groupsByFile.set(file.id,location);
        }
        location.repo.entries.push(entry);
        location.feature.entries.push(entry);
        location.section?.entries.push(entry);
    }
    return {projects,groupsByFile};
}
