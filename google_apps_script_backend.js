// =========================================================================
// NOURII STORE - GOOGLE APPS SCRIPT BACKEND ENGINE (قاعدة بيانات GOOGLE DRIVE)
// =========================================================================
// هذا السكربت يعمل كـ Backend رئيسي وقاعدة بيانات حية في Google Drive / Google Sheets
// يحتوي تلقائياً على كافة بيانات الموقع (الـ 27 منتج والـ 10 أقسام والمستخدمين والأوردرات)
// =========================================================================

const INITIAL_CATEGORIES_SEED = [
  [
    "concrete",
    "كونكريت للتلوين",
    "Concrete for Coloring",
    "fa-palette",
    "assets/images/concrete-coloring.jpg",
    "مجسمات وأشكال كونكريت وجبس مجهزة للتلوين للأطفال والكبار مع ألوان وفرش لإطلاق العنان للإبداع.",
    "Handcrafted concrete figurines and letters ready for painting with included colors and brushes."
  ],
  [
    "coloring_books",
    "كتب تلوين",
    "Coloring Books",
    "fa-book-open",
    "assets/images/coloring-books.jpg",
    "كتب ودفاتر تلوين ورقية برسومات مانديلا وزخارف هندسية وحيوانات مع ألوان خشبية.",
    "Mindful Mandala, geometric patterns, and African safari coloring books with color pencils."
  ],
  [
    "magnets_brooches",
    "صور مغناطيس و بروش",
    "Magnets & Brooches",
    "fa-certificate",
    "assets/images/magnets-brooches.jpg",
    "مغناطيس ثلاجة عائلي مخصص وبروشات خشبية ومعدنية لطيفة لكافة المهن والشخصيات.",
    "Custom family photo fridge magnets, wooden pins, and cute career badges."
  ],
  [
    "event_favors",
    "توزيعات مناسبات",
    "Event Favors & Giveaways",
    "fa-gift",
    "assets/images/event-favors.jpg",
    "توزيعات فاخرة للسبوع، المواليد، الخطوبة، عقد القران، وحنة العروس مطبوعة بالأسماء.",
    "Luxury personalized favors for newborn baby showers, engagements, weddings, and henna."
  ],
  [
    "notebooks",
    "نوت بوك",
    "Notebooks & Planners",
    "fa-book-bookmark",
    "assets/images/notebooks.jpg",
    "دفاتر ومفكرات يومية بأغلفة مخملية منقوشة بالذهب، قوائم مهام، وأقلام راقية.",
    "Custom velvet & faux-leather planners embossed in gold foil with to-do lists and luxury pens."
  ],
  [
    "islamic_prints",
    "مطبوعات دينية",
    "Islamic Prints",
    "fa-mosque",
    "assets/images/islamic-prints.jpg",
    "مصاحف سورة البقرة مخملية فاخرة، كروت أذكار الصباح والمساء، وباقات صدقة جارية.",
    "Royal velvet Quran covers, laminated Azkar morning/evening cards, and Sadaqah Jariyah favor packs."
  ],
  [
    "educational_kids",
    "ادوات تعليمية للاطفال",
    "Educational Kids Tools",
    "fa-shapes",
    "assets/images/educational-kids.jpg",
    "بطاقات الحروف الهجائية، كتاب أبجد هوز، وسائل تفاعلية، وأرقام ومكعبات خشبية مبتكرة.",
    "Arabic alphabet flashcards, interactive learning workbooks, wooden blocks, and educational kits."
  ],
  [
    "luxury_prints",
    "مطبوعات",
    "Luxury Prints & Stationery",
    "fa-envelope-open-text",
    "assets/images/luxury-prints.jpg",
    "كروت إهداء مع أختام شمع راقية، فواصل كتب باقتباسات ملهمة، وأكياس هدايا فخمة.",
    "Wax-sealed luxury envelopes, quote bookmarks, gift tags, and embossed celebration gift bags."
  ],
  [
    "stickers",
    "استيكرز",
    "Stickers & Washi Tapes",
    "fa-note-sticky",
    "assets/images/stickers.jpg",
    "استيكرز فينيل ضد الماء (الفنان الصغير)، عبارات تحفيزية، وشرائط واشي تيب مبهجة.",
    "Waterproof vinyl sticker packs, motivational artist decals, and colorful decorative washi tapes."
  ],
  [
    "others",
    "اخرى",
    "Others & Home Accents",
    "fa-gem",
    "assets/images/others.jpg",
    "قواعد أكواب ريزن بالورد الطبيعي، ميداليات جلدية منقوشة، فواحات عطرية خزفية وبراويز ميني.",
    "Real dried-flower resin coasters, genuine leather keychains, ceramic reed diffusers, and 3D frames."
  ]
];

const INITIAL_PRODUCTS_SEED = [
  [
    "prod-conc-1",
    "concrete",
    "بوكس الفنان الصغير لتلوين الكونكريت",
    "Little Artist Concrete Painting Kit",
    195,
    240,
    "assets/images/concrete-coloring.jpg",
    "الأكثر طلباً ⭐",
    "Best Seller",
    4.9,
    38,
    true,
    "الاسم أو الشكل المفضل (بومة / فيل / مئذنة)",
    "Preferred Figurine (Owl / Elephant / Minaret)",
    "مجموعة فنية متكاملة تحتوي على مجسمات كونكريت ناعمة الملمس وجاهزة للتلوين، 6 ألوان أكريليك زاهية آمنة للأطفال، فرش رسم، وباليت لتفريغ الألوان.",
    "Complete artistic DIY kit featuring smooth handcrafted concrete figurines, 6 vibrant non-toxic paints, brushes, and a palette.",
    "2026-10-09T18:00:16.164Z"
  ],
  [
    "prod-conc-2",
    "concrete",
    "مجسم مئذنة ومسجد كونكريت للتلوين",
    "Concrete Mosque & Minaret Painting Craft",
    120,
    150,
    "assets/images/concrete-coloring.jpg",
    "مميز للمناسبات 🌙",
    "Special Edition",
    5,
    24,
    true,
    "الاسم المراد نقشه على القاعدة (اختياري)",
    "Name to engrave on base (optional)",
    "مجسم هندسي أنيق لمسجد ومئذنة مصنوع من الكونكريت المصقول، نشاط روحاني وإبداعي رائع للأطفال في شهر رمضان والأعياد.",
    "Handcrafted architectural concrete mosque and minaret figurine ready to paint with included warm tones.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-conc-3",
    "concrete",
    "طقم حروف كونكريت مخصصة باسمك مع ألوان",
    "Personalized Concrete Name Letters with Paints",
    160,
    190,
    "assets/images/concrete-coloring.jpg",
    "تخصيص كامل ✏️",
    "Fully Custom",
    4.8,
    19,
    true,
    "اكتب الحروف أو الاسم المطلوب بالإنجليزية أو العربية",
    "Type name letters (e.g., NOUR)",
    "حروف كونكريت ثلاثية الأبعاد باسم طفلك أو من تحب، تأتي مع علبة ألوان وفرشاة لتلوينها والاحتفاظ بها كقطعة ديكور فريدة.",
    "3D concrete alphabet letters customized with your chosen name, ready for custom painting and keepsake display.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-cb-1",
    "coloring_books",
    "كتاب تلوين المانديلا والزخارف الهندسية الفاخر",
    "Mandala & Geometric Designs Premium Coloring Book",
    95,
    120,
    "assets/images/coloring-books.jpg",
    "للاسترخاء 🌸",
    "Relaxing Art",
    4.9,
    42,
    false,
    "",
    "",
    "كتاب تلوين فاخر يحتوي على أكثر من 40 تصميماً من زخارف المانديلا الدقيقة والأشكال الهندسية، مطبوع على ورق سميك عالي الجودة يمنع تسرب الألوان.",
    "Premium coloring book with 40+ intricate mandala and geometric patterns on heavyweight bleed-proof paper.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-cb-2",
    "coloring_books",
    "كتيب تلوين حيوانات السفاري الأفريقية مع علبة ألوان",
    "African Safari Creatures Coloring Booklet + Pencils",
    85,
    105,
    "assets/images/coloring-books.jpg",
    "محبوب الأطفال 🦁",
    "Kids Favorite",
    4.9,
    31,
    false,
    "",
    "",
    "كتيب رسومات كرتونية ظريفة لحيوانات الغابة الأفريقية مصمم لتقوية التركيز والتناسق البصري الحركي لدى الأطفال، يشمل علبة 12 قلم تلوين خشبي ناعم.",
    "Charming safari animal coloring booklet for young artists, bundled with a 12-pack of colored pencils.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-mb-1",
    "magnets_brooches",
    "مغناطيس ثلاجة عائلي مخصص بشكل قلب",
    "Custom Family Heart Fridge Magnet",
    65,
    85,
    "assets/images/magnets-brooches.jpg",
    "هدية دافئة ❤️",
    "Warm Gift",
    5,
    56,
    true,
    "أفراد العائلة أو الرسمة المطلوبة (أب، أم، أطفال)",
    "Family members to feature (Dad, Mom, Kids)",
    "مغناطيس ثلاجة بقاعدة خشبية بشكل قلب مع رسم كرتوني يمثل عائلتك، مغلف بطبقة حماية لامعة مقاومة للماء والخدوش.",
    "Heart-shaped wooden fridge magnet customized with your family cartoon illustration and waterproof gloss finish.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-mb-2",
    "magnets_brooches",
    "مجموعة بروشات ودبابيس المهن اللطيفة",
    "Cute Career Badge Pins & Brooches Set",
    80,
    100,
    "assets/images/magnets-brooches.jpg",
    "أشكال متنوعة 👩‍⚕️",
    "Multi-Style",
    4.8,
    27,
    true,
    "اختر المهنة (طبيب / مهندس / معلم / فنان / شيف)",
    "Select profession (Doctor / Engineer / Teacher / Artist)",
    "دبابيس وبروشات معدنية وخشبية برسومات مميزة لشخصيات المهن، مثالية كهدية تخرج أو للتزيين على الحقائب والملابس.",
    "Delightful profession pins (Doctor, Engineer, Chef, Artist) with secure metal clasp backing.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-ef-1",
    "event_favors",
    "توزيعات المواليد والسبوع الملكية (باك 12 قطعة)",
    "Royal Newborn Baby Shower Favors (Pack of 12)",
    280,
    340,
    "assets/images/event-favors.jpg",
    "مواليد جدد 🍼",
    "Baby Shower",
    5,
    64,
    true,
    "اسم المولود وتاريخ المناسبة",
    "Baby Name & Date of Event",
    "علب توزيعات أنيقة برسمة فيل لطيف أو دب كرتوني، تشمل حبات شوكولاتة فاخرة، كيس قماشي مع سبحة ميني، وكارت إهداء مطبوع باسم المولود.",
    "Exquisite baby shower favor boxes with customized baby name tag, luxury chocolate, mini tasbeeh, and pouch.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-ef-2",
    "event_favors",
    "طقم توزيعات عقد القران والزفاف الفاخر",
    "Luxury Katb Ktab & Wedding Favor Set",
    450,
    520,
    "assets/images/event-favors.jpg",
    "عقد قران مبارك 💍",
    "Wedding Edition",
    4.9,
    48,
    true,
    "اسمي العروسين وتاريخ عقد القران",
    "Couples Names & Event Date",
    "توزيعات عقد القران الفاخرة تتضمن مصحفاً ميني مخملياً، سبحة كريستالية بلون عنبري، وثيقة عقد قران مصغرة، ومروحة ورقية كلاسيكية.",
    "Luxury Islamic wedding favors with mini velvet Quran, amber-tone tasbeeh, wedding scroll, and silk fan.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-ef-3",
    "event_favors",
    "مجموعة توزيعات حنة العروس التراثية",
    "Bridal Henna Night Favors Collection",
    390,
    460,
    "assets/images/event-favors.jpg",
    "حنة العروس 🌺",
    "Henna Night",
    4.9,
    22,
    true,
    "اسم العروس للطباعة على الظرف والمرآة",
    "Bride Name for Envelope and Mirror",
    "باقة حنة راقية تشمل مرآة يدوية بزخارف شرقية ملونة، بوكس فانوس مخرم، حبات بخور أو مسك عطري، وظرف إهداء مطبوع بعبارة حنة العروس.",
    "Authentic bridal henna favors featuring oriental hand mirror, die-cut lantern box, and perfumed musk.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-nb-1",
    "notebooks",
    "نوت بوك ملكي جلد وردي منقوش بالذهب باسمك",
    "Rose Gold Foil Personalized Leather Journal",
    175,
    220,
    "assets/images/notebooks.jpg",
    "تطريز ذهبي ✨",
    "Gold Foil Name",
    5,
    52,
    true,
    "الاسم المراد نقشه بالذهب (مثال: نور / سارة)",
    "Name to engrave in gold (e.g., Noor)",
    "نوت بوك جلدي فاخر بلون وردي ناعم، منقوش عليه اسمك بخط عربي ديواني باللون الذهبي البارز، مع أوراق عاجية مسطرة 100 جرام وشريط إشارة حريري.",
    "Sophisticated dusty rose faux-leather journal with your name stamped in gold Arabic calligraphy on 100gsm cream paper.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-nb-2",
    "notebooks",
    "طقم التدوين المتكامل (نوت بوك + To Do List + قلم ذهبي)",
    "Executive Stationery Gift Set (Journal + Notepad + Gold Pen)",
    260,
    310,
    "assets/images/notebooks.jpg",
    "طقم هدايا راقي 🎁",
    "Full Gift Set",
    4.9,
    39,
    true,
    "الاسم المطلوب على النوت بوك والقلم",
    "Name for Journal and Pen engraving",
    "طقم هدية متكامل يشمل دفتر يوميات، مفكرة مهام يومية (To Do List)، نوتباد صغير، قلم ذهبي منقوش بالاسم، ومشبك ذهبي أنيق مع شريط واشي تيب.",
    "Complete desk gift set including journal, tear-off daily task pad, pocket notepad, custom engraved gold pen, and clips.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-ip-1",
    "islamic_prints",
    "مصحف سورة البقرة مخمل ملكي أخضر مع قلم مذهب",
    "Royal Green Velvet Surah Al-Baqarah Quran + Gold Pen",
    220,
    270,
    "assets/images/islamic-prints.jpg",
    "مخمل ملكي 🌿",
    "Royal Velvet",
    5,
    59,
    true,
    "اسم الإهداء أو الصدقة الجارية (اختياري)",
    "Dedication or Name (optional)",
    "مصحف سورة البقرة كاملة بغلاف مخملي أخضر زمردي بنقوش عربية ذهبية بارزة، مع قلم أنيق وحافظة مخملية وكرت أذكار الصباح والمساء.",
    "Exquisite emerald-green velvet cover Surah Al-Baqarah edition with gilded ornaments, gold pen, and Azkar card.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-ip-2",
    "islamic_prints",
    "كروت أذكار الصباح والمساء وأذكار بعد الصلاة (مصفحة)",
    "Laminated Morning & Evening Azkar Card Set",
    75,
    95,
    "assets/images/islamic-prints.jpg",
    "حجم مناسب للجيب 📿",
    "Pocket Size",
    4.9,
    44,
    false,
    "",
    "",
    "كروت أنيقة مطبوعة بخط واضح ومصفحة بطبقة حماية ضد التلف والماء، تضم أذكار الصباح والمساء كاملة وأذكار ما بعد الصلوات المكتوبة.",
    "Crystal-clear laminated Azkar cards for daily remembrance, pocket-sized and protected against water and wear.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-ip-3",
    "islamic_prints",
    "باقات صدقة جارية مخصصة (باك 20 كارت وميني مصحف)",
    "Custom Sadaqah Jariyah Remembrance Pack (20 Units)",
    350,
    420,
    "assets/images/islamic-prints.jpg",
    "صدقة جارية 🤲",
    "Sadaqah Jariyah",
    5,
    36,
    true,
    "اسم المتوفى أو صاحب الصدقة للدعاء",
    "Name for Dedication and Prayers",
    "باقات توزيعات راقية مع ربطة فيونكة ستان خضراء وذهبية، تشمل مصاحف ميني وكروت دعاء مطبوعة باسم من تحبون كصدقة جارية.",
    "Elegantly wrapped memorial gift favors with ribbon bows, mini Qurans, and personalized dua cards.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-ek-1",
    "educational_kids",
    "كتاب تفاعلي أبجد هوز لتعليم القراءة والكتابة",
    "Interactive Abjad Hawaz Arabic Alphabet Activity Book",
    145,
    180,
    "assets/images/educational-kids.jpg",
    "تفاعلي وممتع 🧩",
    "Interactive Fun",
    4.9,
    47,
    true,
    "اسم الطفل للطباعة على غلاف الكتاب",
    "Child's name for cover customization",
    "كتاب ألعاب تعليمية ملون يدمج بين المرح والتعلم، يحتوي على أنشطة تتبع الحروف، تلوين الكلمات، وتوصيل الحروف بالأشياء اليومية.",
    "Engaging hardcover educational book teaching Arabic alphabet and phonetics through playful exercises.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-ek-2",
    "educational_kids",
    "فلاش كاردز الحروف والحيوانات التفاعلية للأطفال",
    "Arabic Alphabet & Animals Flashcards Set",
    95,
    120,
    "assets/images/educational-kids.jpg",
    "كرتون متين 🍎",
    "Durable Cards",
    4.8,
    29,
    false,
    "",
    "",
    "28 بطاقة تعليمية سميكة بحواف دائرية آمنة، مطبوعة برسومات ملونة وأسماء واضحة (أ - تفاحة، د - دب، س - سيارة) لتوسيع المفردات اللغوية للطفل.",
    "28 thick rounded-edge flashcards showcasing Arabic letters and illustrated vocabulary words.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-ek-3",
    "educational_kids",
    "حقيبة التوزيعات التعليمية الذكية (مكعبات + عدسة + بوصلة)",
    "Little Explorer Educational Favor Kit (Blocks + Lens)",
    185,
    225,
    "assets/images/educational-kids.jpg",
    "المستكشف الصغير 🔍",
    "Young Explorer",
    4.9,
    21,
    true,
    "اسم المناسبة أو أسماء الأطفال",
    "Event or Children's Names",
    "حقيبة هدايا تعليمية في أظرف قماشية ملونة، تحتوي على عدسة مكبرة للاستكشاف، بوصلة صغيرة، ومكعبات بناء ملونة مع قلم ممتع.",
    "Fabric pouch favor kit packed with a magnifying glass, beginner compass, building blocks, and an activity pen.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-lp-1",
    "luxury_prints",
    "أظرف كلاسيكية فاخرة بختم شمع حقيقي وكروت تهنئة",
    "Real Wax-Sealed Classic Gift Envelopes & Cards",
    110,
    135,
    "assets/images/luxury-prints.jpg",
    "ختم شمع ملكي ✉️",
    "Wax Sealed",
    5,
    38,
    true,
    "العبارة المطبوعة (تهانينا / مبروك / لك)",
    "Printed Text (Congratulations / For You / Mabrouk)",
    "أظرف راقية بلون أخضر ملكي وعاجي مغلقة بأختام شمع ذهبية مع كروت تهنئة سميكة بحروف محفورة بالذهب لمناسباتكم الخاصة.",
    "Luxury textured stationery envelopes with authentic gold wax seals and gold foil letterpress cards.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-lp-2",
    "luxury_prints",
    "طقم فواصل كتب فاخرة باقتباسات ملهمة (3 قطع)",
    "Inspiring Quotes Luxury Bookmark Set (Pack of 3)",
    60,
    75,
    "assets/images/luxury-prints.jpg",
    "لعشاق القراءة 📖",
    "Book Lovers",
    4.8,
    26,
    false,
    "",
    "",
    "ثلاثة فواصل كتب مطبوعة على ورق قطني سميك برسومات فنية وتطريز أشرطة قماشية فاخرة، مع عبارات اقتباس اليوم وشكراً.",
    "Set of 3 artistic cotton-paper bookmarks featuring warm botanical illustrations, quote typography, and ribbon ties.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-lp-3",
    "luxury_prints",
    "أكياس هدايا راقية بنقش ذهبي بارز لمناسباتكم الخاصة",
    "Embossed Luxury Gift Bags with Fabric Handles",
    85,
    110,
    "assets/images/luxury-prints.jpg",
    "تقديم فاخر 🛍️",
    "Luxury Bag",
    4.9,
    19,
    true,
    "اختر العبارة (مناسبة خاصة / أطيب التمنيات)",
    "Choose Text (Special Occasion / Best Wishes)",
    "حقائب هدايا كرتونية فاخرة متوفرة بالأزرق الكحلي والأبيض العاجي، بنقوش إسلامية بارزة وطباعة ذهبية وحزام يد قماشي متين.",
    "High-density embossed paper gift bags with opulent arabesque patterns and sturdy woven handles.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-st-1",
    "stickers",
    "باك استيكرز الفنان الصغير ضد الماء والتمزق",
    "Little Artist Waterproof Vinyl Sticker Pack",
    55,
    70,
    "assets/images/stickers.jpg",
    "مقاوم للماء 🎨",
    "Waterproof Vinyl",
    4.9,
    45,
    false,
    "",
    "",
    "مجموعة ملصقات فينيل عالية الجودة بتصاميم كرتونية مرحة لأدوات الرسم والفرش والألوان وشخصيات الفنان الصغير، مثالية لتزيين الدفاتر واللابتوب.",
    "Vibrant vinyl die-cut stickers depicting art supplies, mini easels, and cute artist characters; fully waterproof.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-st-2",
    "stickers",
    "شيت استيكرز عبارات تحفيزية ونجوم ذهبية",
    "Motivational Stars & Quotes Sticker Sheet",
    45,
    60,
    "assets/images/stickers.jpg",
    "تشجيع للأطفال ⭐",
    "Motivational",
    4.8,
    33,
    false,
    "",
    "",
    "شيت ملصقات مميز بعبارات تحفيزية مشجعة مثل (الفن حياة، أنا فنان، أرسم مستقبلي) مع نجوم ذهبية لامعة لتكريم ومكافأة الأطفال.",
    "Inspiring reward stickers with gold metallic stars and positive affirmation quotes in Arabic calligraphy.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-st-3",
    "stickers",
    "طقم شرائط واشي تيب مبهجة للتزيين (3 رولات)",
    "Artistic Decorative Washi Tape Rolls (Set of 3)",
    75,
    95,
    "assets/images/stickers.jpg",
    "تزيين الدفاتر ✂️",
    "Washi Tape Set",
    4.9,
    22,
    false,
    "",
    "",
    "ثلاثة رولات واشي تيب ورقية يابانية سهلة اللصق والنزع بنقوش أدوات رسم وألوان مائية، لتزيين اليوميات والبطاقات والعلب.",
    "Trio of premium Japanese washi tape rolls featuring colorful palette and paintbrush motifs; peel-and-stick.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-ot-1",
    "others",
    "قواعد أكواب ريزن بالورد الطبيعي المجفف والذهب",
    "Real Pressed Flower & Gold Leaf Resin Coaster Set",
    160,
    200,
    "assets/images/others.jpg",
    "صناعة يدوية فريدة 🌸",
    "Handmade Resin",
    5,
    37,
    true,
    "ألوان الزهور المفضلة (وردي / أبيض / لافندر)",
    "Flower color preference (Pink / White / Lavender)",
    "قواعد أكواب فاخرة مصنوعة يدوياً من الريزن الشفاف عالي النقاوة، مدمجة بزهور طبيعية مجففة بعناية ورقائق ذهب عيار 24.",
    "Hand-poured crystal clear resin coasters with real preserved botanical flowers and subtle gold flakes.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-ot-2",
    "others",
    "ميداليات مفاتيح جلدية طبيعية مع دلاية معدنية",
    "Handcrafted Leather Keychain with Bronze Charm",
    90,
    115,
    "assets/images/others.jpg",
    "جلد طبيعي 🔑",
    "Genuine Leather",
    4.8,
    28,
    true,
    "الحرف أو الاسم المراد نقشه على الجلد",
    "Initial or Name to stamp on leather",
    "ميدالية مفاتيح مصنوعة من الجلد الطبيعي الفاخر مع حلقة نحاسية عتيقة ودلاية شجرة الحياة البرونزية، متوفرة بألوان كلاسيكية أنيقة.",
    "Artisan genuine leather strap keychain with antique brass hardware and tree-of-life medallion.",
    "2026-10-09T18:00:16.165Z"
  ],
  [
    "prod-ot-3",
    "others",
    "فواحة عطرية خزفية شرقية مع أعواد خشبية وزيت عطري",
    "Moroccan Ceramic Reed Diffuser + Fragrance Oil",
    180,
    220,
    "assets/images/others.jpg",
    "رائحة زكية 🌿",
    "Aromatherapy",
    4.9,
    31,
    true,
    "اختر الرائحة (لافندر / مسك أبيض / فانيليا)",
    "Choose Scent (Lavender / White Musk / Vanilla)",
    "فواحة سيراميك مزخرفة بنقوش أندلسية زرقاء دافئة، تأتي مع أعواد قصب خشبية وزجاجة زيت عطري مركز تدوم رائحته لأسابيع.",
    "Artisanal glazed ceramic reed diffuser with Moroccan motifs, accompanied by natural rattan reeds and pure aroma oil.",
    "2026-10-09T18:00:16.165Z"
  ]
];

// دالة التهيئة الأولية وتعبئة كامل بيانات الموقع تلقائياً
function setupDatabase() {
  return seedAllWebsiteData();
}

// دالة تعبئة أو تحديث بيانات الموقع في Google Sheet
function seedAllWebsiteData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. ورقة المنتجات Products (قاعدة بيانات المتجر الرئيسية)
  let prodSheet = ss.getSheetByName("Products");
  if (!prodSheet) {
    prodSheet = ss.insertSheet("Products");
  }
  
  const existingProds = prodSheet.getDataRange().getValues();
  if (existingProds.length <= 1) {
    prodSheet.clear();
    prodSheet.appendRow([
      "id", "categoryId", "nameAr", "nameEn", "price", "originalPrice",
      "image", "badgeAr", "badgeEn", "rating", "reviewsCount", 
      "isCustomizable", "customFieldLabelAr", "customFieldLabelEn", 
      "descriptionAr", "descriptionEn", "updatedAt"
    ]);
    prodSheet.setFrozenRows(1);
    
    // إضافة كافة منتجات المتجر الـ 27 تلقائياً
    if (INITIAL_PRODUCTS_SEED && INITIAL_PRODUCTS_SEED.length > 0) {
      prodSheet.getRange(2, 1, INITIAL_PRODUCTS_SEED.length, INITIAL_PRODUCTS_SEED[0].length).setValues(INITIAL_PRODUCTS_SEED);
    }
  }

  // 2. ورقة الأقسام Categories
  let catSheet = ss.getSheetByName("Categories");
  if (!catSheet) {
    catSheet = ss.insertSheet("Categories");
  }
  const existingCats = catSheet.getDataRange().getValues();
  if (existingCats.length <= 1) {
    catSheet.clear();
    catSheet.appendRow(["id", "nameAr", "nameEn", "icon", "image", "descriptionAr", "descriptionEn"]);
    catSheet.setFrozenRows(1);
    if (INITIAL_CATEGORIES_SEED && INITIAL_CATEGORIES_SEED.length > 0) {
      catSheet.getRange(2, 1, INITIAL_CATEGORIES_SEED.length, INITIAL_CATEGORIES_SEED[0].length).setValues(INITIAL_CATEGORIES_SEED);
    }
  }

  // 3. ورقة المستخدمين Users
  let usersSheet = ss.getSheetByName("Users");
  if (!usersSheet) {
    usersSheet = ss.insertSheet("Users");
    usersSheet.appendRow([
      "username", "password", "fullName", "role", "createdAt", "isActive", "mustChangePassword"
    ]);
    // إضافة حساب المشرف الافتراضي
    usersSheet.appendRow([
      "admin", "nourii2026", "مدير النظام (Admin)", "admin", new Date().toISOString(), true, false
    ]);
    usersSheet.setFrozenRows(1);
  }

  // 4. ورقة أرشيف الطلبات Orders
  let ordersSheet = ss.getSheetByName("Orders");
  if (!ordersSheet) {
    ordersSheet = ss.insertSheet("Orders");
    ordersSheet.appendRow([
      "orderId", "customerName", "phone", "city", "address", 
      "total", "items", "notes", "createdAt"
    ]);
    ordersSheet.setFrozenRows(1);
  }

  return "تم تهيئة وتعبئة قاعدة بيانات المتجر بنجاح! تم إدراج " + INITIAL_PRODUCTS_SEED.length + " منتج و " + INITIAL_CATEGORIES_SEED.length + " أقسام.";
}

// =========================================================================
// معالجة طلبات GET (جلب المنتجات أو الأقسام أو المستخدمين كـ API رئيسي)
// =========================================================================
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getProducts";

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // فحص الاتصال Ping
    if (action === "ping") {
      return createResponse({
        status: "success",
        message: "Nourii Google Drive Backend is Active and Live!",
        timestamp: new Date().toISOString()
      });
    }

    // جلب المنتجات لصفحة المتجر الرئيسية (Main Source)
    if (action === "getProducts") {
      const sheet = ss.getSheetByName("Products");
      if (!sheet) return createResponse({ status: "error", message: "Products sheet not found" });

      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return createResponse({ status: "success", data: [] });

      const headers = data[0];
      const products = [];

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue; // تخطي الفارغ
        const item = {};
        for (let j = 0; j < headers.length; j++) {
          item[headers[j]] = row[j];
        }
        item.price = Number(item.price) || 0;
        item.originalPrice = Number(item.originalPrice) || 0;
        item.rating = Number(item.rating) || 5.0;
        item.reviewsCount = Number(item.reviewsCount) || 1;
        item.isCustomizable = item.isCustomizable === true || item.isCustomizable === "true" || item.isCustomizable === "TRUE";
        products.push(item);
      }

      return createResponse({ status: "success", count: products.length, data: products, source: "Google Drive Live" });
    }

    // جلب الأقسام
    if (action === "getCategories") {
      const sheet = ss.getSheetByName("Categories");
      if (!sheet) return createResponse({ status: "error", message: "Categories sheet not found" });

      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return createResponse({ status: "success", data: [] });

      const headers = data[0];
      const categories = [];

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;
        const item = {};
        for (let j = 0; j < headers.length; j++) {
          item[headers[j]] = row[j];
        }
        categories.push(item);
      }

      return createResponse({ status: "success", count: categories.length, data: categories });
    }

    // جلب المستخدمين للوحة الإدارة
    if (action === "getUsers") {
      const sheet = ss.getSheetByName("Users");
      if (!sheet) return createResponse({ status: "error", message: "Users sheet not found" });

      const data = sheet.getDataRange().getValues();
      const users = [];

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;
        users.push({
          username: row[0],
          fullName: row[2],
          role: row[3],
          createdAt: row[4],
          isActive: row[5] === true || String(row[5]).toUpperCase() === "TRUE",
          mustChangePassword: row[6] === true || String(row[6]).toUpperCase() === "TRUE"
        });
      }

      return createResponse({ status: "success", count: users.length, data: users });
    }

    return createResponse({ status: "error", message: "Unknown action" });

  } catch (error) {
    return createResponse({ status: "error", message: error.toString() });
  }
}

// =========================================================================
// معالجة طلبات POST (تسجيل الدخول، تغيير كلمات المرور، حفظ المنتجات مفرداً أو بالجملة)
// =========================================================================
function doPost(e) {
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    const action = body.action || "saveProduct";
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. تسجيل الدخول والتحقق من المستخدم
    if (action === "login") {
      const sheet = ss.getSheetByName("Users");
      if (!sheet) return createResponse({ status: "error", message: "Users sheet not found" });

      const data = sheet.getDataRange().getValues();
      const username = (body.username || "").trim().toLowerCase();
      const password = (body.password || "").trim();

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (String(row[0]).trim().toLowerCase() === username && String(row[1]).trim() === password) {
          if (row[5] === false || String(row[5]).toUpperCase() === "FALSE") {
            return createResponse({ status: "error", message: "هذا الحساب معطل حالياً من قِبل الإدارة" });
          }

          const mustChangePassword = row[6] === true || String(row[6]).toUpperCase() === "TRUE";

          return createResponse({
            status: "success",
            user: {
              username: row[0],
              fullName: row[2],
              role: row[3],
              mustChangePassword: mustChangePassword
            }
          });
        }
      }
      return createResponse({ status: "error", message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    }

    // 2. تغيير كلمة المرور للمستخدم (أول مرة أو من لوحة التحكم)
    if (action === "changePassword") {
      const sheet = ss.getSheetByName("Users");
      if (!sheet) return createResponse({ status: "error", message: "Users sheet not found" });

      const username = (body.username || "").trim().toLowerCase();
      const newPassword = (body.newPassword || "").trim();

      if (!newPassword || newPassword.length < 4) {
        return createResponse({ status: "error", message: "كلمة المرور يجب أن لا تقل عن 4 خانات" });
      }

      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim().toLowerCase() === username) {
          sheet.getRange(i + 1, 2).setValue(newPassword);
          sheet.getRange(i + 1, 7).setValue(false);
          return createResponse({ 
            status: "success", 
            message: "تم تحديث كلمة المرور بنجاح!" 
          });
        }
      }
      return createResponse({ status: "error", message: "المستخدم غير موجود" });
    }

    // 3. حفظ / تعديل مستخدم جديد
    if (action === "saveUser") {
      const sheet = ss.getSheetByName("Users");
      const user = body.user;
      if (!user || !user.username) return createResponse({ status: "error", message: "Missing user data" });

      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).toLowerCase() === String(user.username).toLowerCase()) {
          rowIndex = i + 1;
          break;
        }
      }

      const mustChange = user.mustChangePassword !== undefined ? user.mustChangePassword : true;

      if (rowIndex > 0) {
        const existingPass = data[rowIndex - 1][1];
        sheet.getRange(rowIndex, 1, 1, 7).setValues([[
          user.username,
          user.password ? user.password : existingPass,
          user.fullName || "",
          user.role || "editor",
          data[rowIndex - 1][4],
          user.isActive !== false,
          mustChange
        ]]);
      } else {
        sheet.appendRow([
          user.username,
          user.password || "temp1234",
          user.fullName || user.username,
          user.role || "editor",
          new Date().toISOString(),
          true,
          mustChange
        ]);
      }

      return createResponse({ status: "success", message: "تم حفظ المستخدم بنجاح" });
    }

    // 4. حذف مستخدم
    if (action === "deleteUser") {
      const sheet = ss.getSheetByName("Users");
      const username = String(body.username || "").toLowerCase();
      if (username === "admin") {
        return createResponse({ status: "error", message: "لا يمكن حذف حساب المشرف الرئيسي" });
      }

      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).toLowerCase() === username) {
          sheet.deleteRow(i + 1);
          return createResponse({ status: "success", message: "تم حذف المستخدم بنجاح" });
        }
      }
      return createResponse({ status: "error", message: "المستخدم غير موجود" });
    }

    // 5. استيراد منتجات بالجملة (Bulk Import All Products)
    if (action === "bulkImportProducts") {
      const sheet = ss.getSheetByName("Products");
      if (!sheet) return createResponse({ status: "error", message: "Products sheet not found" });

      const products = body.products || [];
      if (!Array.isArray(products) || products.length === 0) {
        return createResponse({ status: "error", message: "No products provided" });
      }

      sheet.clear();
      sheet.appendRow([
        "id", "categoryId", "nameAr", "nameEn", "price", "originalPrice",
        "image", "badgeAr", "badgeEn", "rating", "reviewsCount", 
        "isCustomizable", "customFieldLabelAr", "customFieldLabelEn", 
        "descriptionAr", "descriptionEn", "updatedAt"
      ]);
      sheet.setFrozenRows(1);

      const rows = products.map(prod => [
        prod.id,
        prod.categoryId || "others",
        prod.nameAr || "",
        prod.nameEn || "",
        Number(prod.price) || 0,
        Number(prod.originalPrice) || Number(prod.price) || 0,
        prod.image || "",
        prod.badgeAr || "",
        prod.badgeEn || "",
        Number(prod.rating) || 5.0,
        Number(prod.reviewsCount) || 1,
        Boolean(prod.isCustomizable),
        prod.customFieldLabelAr || "",
        prod.customFieldLabelEn || "",
        prod.descriptionAr || "",
        prod.descriptionEn || "",
        new Date().toISOString()
      ]);

      sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);

      return createResponse({
        status: "success",
        message: "تم تحديث واستيراد " + rows.length + " منتج بنجاح إلى Google Sheets!",
        count: rows.length
      });
    }

    // 6. حفظ / تعديل منتج فردي
    if (action === "saveProduct") {
      const sheet = ss.getSheetByName("Products");
      const prod = body.product;
      if (!prod || !prod.id) return createResponse({ status: "error", message: "Missing product data" });

      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(prod.id)) {
          rowIndex = i + 1;
          break;
        }
      }

      const rowValues = [
        prod.id,
        prod.categoryId || "others",
        prod.nameAr || "",
        prod.nameEn || "",
        Number(prod.price) || 0,
        Number(prod.originalPrice) || 0,
        prod.image || "",
        prod.badgeAr || "",
        prod.badgeEn || "",
        Number(prod.rating) || 5.0,
        Number(prod.reviewsCount) || 1,
        Boolean(prod.isCustomizable),
        prod.customFieldLabelAr || "",
        prod.customFieldLabelEn || "",
        prod.descriptionAr || "",
        prod.descriptionEn || "",
        new Date().toISOString()
      ];

      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
      } else {
        sheet.appendRow(rowValues);
      }

      return createResponse({ status: "success", message: "تم حفظ المنتج في Google Drive بنجاح", product: prod });
    }

    // 7. حذف منتج
    if (action === "deleteProduct") {
      const sheet = ss.getSheetByName("Products");
      const prodId = body.id;
      const data = sheet.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(prodId)) {
          sheet.deleteRow(i + 1);
          return createResponse({ status: "success", message: "تم حذف المنتج بنجاح من Google Drive" });
        }
      }
      return createResponse({ status: "error", message: "المنتج غير موجود" });
    }

    // 8. رفع صورة إلى مجلد Google Drive
    if (action === "uploadImage") {
      const base64Data = body.base64Data;
      const filename = body.filename || ("nourii-" + Date.now() + ".jpg");
      const mimeType = body.mimeType || "image/jpeg";

      if (!base64Data) return createResponse({ status: "error", message: "بيانات الصورة مفقودة" });

      let folders = DriveApp.getFoldersByName("Nourii Media");
      let folder;
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder("Nourii Media");
      }

      const decoded = Utilities.base64Decode(base64Data.split(",")[1] || base64Data);
      const blob = Utilities.newBlob(decoded, mimeType, filename);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      const publicUrl = "https://lh3.googleusercontent.com/d/" + file.getId();

      return createResponse({
        status: "success",
        imageUrl: publicUrl,
        fileId: file.getId()
      });
    }

    return createResponse({ status: "error", message: "Unknown action" });

  } catch (err) {
    return createResponse({ status: "error", message: err.toString() });
  }
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
