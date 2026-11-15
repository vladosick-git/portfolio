// Всё, что обычно приходится менять, лежит в этом файле.
// После правки достаточно обновить страницу в браузере.

window.SITE = {
  name: "Владислав",

  // Ник в Telegram без @, например "nik". Пока пусто — кнопки ведут на GitHub.
  telegram: "",
  github: "https://github.com/vladosick-git",

  // object: какой предмет собирается из частиц перед работой (bean, tyre, house, phone).
  // img: скриншот для компьютера; рядом лежат -t (планшет) и -m (телефон).
  // price и term показываются, только если заполнены.
  works: [
    {
      id: "zhar",
      object: "bean",
      kind: "Интернет-магазин кофе",
      title: "Жар",
      lead: "Магазин обжарщика: каталог, корзина и подписка.",
      text: "Свежая обжарка с фильтрами по способу заваривания, корзина, подписка на кофе каждый месяц и карта кофеен.",
      points: ["Каталог с фильтрами", "Корзина и подписка", "Версия для телефона"],
      stack: "HTML, CSS, JavaScript",
      img: "img/works/zhar.jpg",
      link: "work/zhar/",
      price: "",
      term: ""
    },
    {
      id: "protektor",
      object: "tyre",
      kind: "Каталог шин и дисков",
      title: "Протектор",
      lead: "Подбор б/у шин по размеру за три клика.",
      text: "Фильтр по ширине, профилю, диаметру и сезону сразу показывает, сколько комплектов есть. У каждого комплекта фото с замером протектора.",
      points: ["Подбор по размеру и сезону", "Избранное и заявка", "Города и доставка"],
      stack: "HTML, CSS, JavaScript",
      img: "img/works/protektor.jpg",
      link: "https://vladosick-git.github.io/protektor-demo/",
      price: "",
      term: ""
    },
    {
      id: "stroy",
      object: "house",
      kind: "ИИ-сервис сметы",
      title: "СметаПро AI",
      lead: "Смета на ремонт за две минуты.",
      text: "Клиент отвечает на три вопроса и описывает объект своими словами. Цифры считают формулы, а нейросети разбирают заявку, ищут риски и пишут заключение.",
      points: ["Расчёт по формулам, не «на глаз»", "Пять шагов проверки", "Готовый документ для клиента"],
      stack: "Python, GPT, Gemini, HTML, JavaScript",
      img: "img/works/stroy.jpg",
      link: "https://vladosick-git.github.io/stroy-ai-demo/",
      price: "",
      term: ""
    },
    {
      id: "drop",
      object: "phone",
      kind: "Мини-приложение в Telegram",
      title: "ДРОП",
      lead: "Магазин одежды прямо внутри Telegram.",
      text: "Каталог, карточка товара, корзина и баллы, а у владельца админка в том же Telegram: сводка, заказы, товары.",
      points: ["Каталог, корзина, баллы", "Админка в Telegram", "Работает без установки"],
      stack: "Telegram Mini App, JavaScript",
      img: "img/works/drop.jpg",
      link: "https://vladosick-git.github.io/drop-miniapp/",
      price: "",
      term: ""
    }
  ]
};
