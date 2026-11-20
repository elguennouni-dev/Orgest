package com.orgest.service;

import java.util.List;
import java.util.Optional;

/** Outils gratuits pour bijoutiers (calculateurs côté navigateur). Le contenu éditorial vit ici : une seule source pour le SEO et l'interface. */
public final class ToolCatalog {
    private ToolCatalog() {}

    public record Faq(String q, String a) {}

    /** kind : reprise | carats | echeancier. lang : fr | ar. */
    public record Tool(String slug, String kind, String lang, String title, String metaTitle, String description,
                       String intro, String formula, String example, List<Faq> faq) {}

    public static final List<Tool> ALL = List.of(
        new Tool("calculateur-reprise-or-ancien", "reprise", "fr",
            "Calculateur de reprise d’or ancien : poids net et montant à verser",
            "Calculateur reprise d’or ancien : poids net et prix",
            "Calculez gratuitement le poids net et le montant à verser pour de l’or ancien : poids brut, déduction et prix d’achat du jour. Outil pour bijoutiers au Maroc.",
            "Un client apporte un vieux bijou : entrez le poids brut, la déduction pour la perte à la fonte et votre prix d’achat du jour. Le calculateur affiche le poids net et le montant à verser, arrondis comme dans un reçu.",
            "Poids net = poids brut × (1 − déduction) ; montant = poids net × prix d’achat du jour",
            "Exemple fictif : 12,00 g, déduction 3 %, prix d’achat 400 DH/g → poids net 11,64 g → 4 656 DH.",
            List.of(new Faq("Quelle déduction appliquer ?", "Elle dépend de l’état du bijou (pierres, soudures, usure). Fixez une règle claire dans votre boutique et annoncez-la au client avant le calcul."),
                    new Faq("Quel prix utiliser ?", "Votre prix d’achat du jour pour le carat concerné, pas le prix de vente ni celui de la veille."),
                    new Faq("Les résultats sont-ils des conseils financiers ?", "Non. L’outil applique une formule avec vos propres chiffres ; il ne donne ni cours de l’or ni conseil financier."))),
        new Tool("convertisseur-carats-or-prix-gramme", "carats", "fr",
            "Convertisseur de carats : prix du gramme d’or en 18K, 21K, 24K",
            "Convertisseur de carats d’or : prix au gramme",
            "Passez du prix du gramme d’un carat à tous les autres (24K, 22K, 21K, 20K, 18K, 14K, 9K). Gratuit, pour bijoutiers.",
            "Saisissez le prix du gramme pour un carat de référence : l’outil calcule la valeur de l’or contenu dans un gramme de chaque autre carat, avec la proportion carat ÷ 24.",
            "Valeur du gramme = prix de référence × (carat ÷ carat de référence)",
            "Exemple fictif : 700 DH/g en 24K → 525 DH/g en 18K et 612,50 DH/g en 21K.",
            List.of(new Faq("Pourquoi diviser par 24 ?", "Le carat exprime la part d’or pur sur 24 parts : un bijou 18K contient 18/24, soit 75 % d’or pur."),
                    new Faq("Est-ce le prix de vente du bijou ?", "Non. C’est la valeur de l’or contenu ; votre prix de vente ajoute la main d’œuvre et votre marge."),
                    new Faq("D’où vient le prix de référence ?", "Vous le saisissez : l’outil n’affiche aucun cours de l’or."))),
        new Tool("calculateur-echeancier-vente-a-temperament", "echeancier", "fr",
            "Calculateur d’échéancier à tempérament : mensualités exactes au centime",
            "Calculateur d’échéancier à tempérament au centime",
            "Calculez gratuitement un échéancier de vente à tempérament : acompte, reste à payer et mensualités dont la somme est exacte au centime près.",
            "Entrez le prix, l’acompte et le nombre de mois : le calculateur répartit le reste à payer en mensualités. Si la division ne tombe pas juste, les centimes restants s’ajoutent aux premières échéances pour que le total soit exact.",
            "Reste à payer = prix − acompte ; mensualité ≈ reste ÷ nombre de mois (centimes sur les premières échéances)",
            "Exemple fictif : 5 000 DH, acompte 1 000 DH, 3 mois → 1 333,34 + 1 333,33 + 1 333,33 DH.",
            List.of(new Faq("Pourquoi les mensualités ne sont-elles pas toutes identiques ?", "Pour que la somme soit exacte, le centime d’écart est ajouté aux premières échéances. L’écart maximal est de 0,01 DH."),
                    new Faq("Quelle durée choisir ?", "Une durée courte limite le risque de retard et les variations du cours de l’or. Proposez quelques durées standard."),
                    new Faq("L’outil remplace-t-il un contrat ?", "Non. Il calcule les montants ; faites toujours signer un reçu avec les dates et les montants."))),
        new Tool("hasibat-thaman-addahab-alqadim", "reprise", "ar",
            "حاسبة الذهب القديم: الوزن الصافي والمبلغ المدفوع",
            "حاسبة ثمن الذهب القديم: الوزن الصافي والمبلغ",
            "احسب مجاناً الوزن الصافي والمبلغ الواجب دفعه للذهب القديم: الوزن الخام، نسبة الخصم وثمن الشراء لليوم. أداة لأصحاب محلات الذهب بالمغرب.",
            "يحضر الزبون قطعة قديمة: أدخل الوزن الخام ونسبة الخصم عن ضياع الصهر وثمن الشراء لليوم، فتظهر لك الحاسبة الوزن الصافي والمبلغ الواجب دفعه، بنفس تقريب الوصل.",
            "الوزن الصافي = الوزن الخام × (1 − نسبة الخصم) ؛ المبلغ = الوزن الصافي × ثمن الشراء لليوم",
            "مثال افتراضي: 12,00 غ، خصم 3 %، ثمن الشراء 400 درهم للغرام ← الوزن الصافي 11,64 غ ← 4 656 درهم.",
            List.of(new Faq("ما نسبة الخصم المناسبة؟", "تختلف حسب حالة القطعة (أحجار، لحام، تآكل). حدد قاعدة واضحة في محلك وأخبر بها الزبون قبل الحساب."),
                    new Faq("أي ثمن أستعمل؟", "ثمن الشراء لليوم للعيار المعني، وليس ثمن البيع ولا ثمن البارح."),
                    new Faq("هل النتيجة نصيحة مالية؟", "لا. الأداة تطبق معادلة بأرقامك أنت ولا تعرض ثمن الذهب ولا تقدم نصيحة مالية."))),
        new Tool("muhawwil-ayarat-addahab-thaman-algram", "carats", "ar",
            "محوّل عيارات الذهب: ثمن الغرام بعيار 18 و21 و24",
            "محوّل عيارات الذهب: ثمن الغرام",
            "انتقل من ثمن غرام عيار معين إلى باقي العيارات (24، 22، 21، 20، 18، 14، 9). مجاني لأصحاب محلات الذهب.",
            "أدخل ثمن الغرام لعيار مرجعي، فتحسب الأداة قيمة الذهب الموجود في غرام من كل عيار آخر بنسبة العيار ÷ 24.",
            "قيمة الغرام = الثمن المرجعي × (العيار ÷ العيار المرجعي)",
            "مثال افتراضي: 700 درهم للغرام بعيار 24 ← 525 درهم بعيار 18 و612,50 درهم بعيار 21.",
            List.of(new Faq("لماذا نقسم على 24؟", "العيار يعبّر عن نسبة الذهب الخالص من 24 جزءاً: قطعة عيار 18 فيها 18/24 أي 75 % ذهب خالص."),
                    new Faq("هل هذا هو ثمن بيع القطعة؟", "لا. هذه قيمة الذهب الموجود فيها، وثمن بيعك يضيف المصنعية وهامش ربحك."),
                    new Faq("من أين يأتي الثمن المرجعي؟", "أنت من يدخله، فالأداة لا تعرض أي ثمن للذهب."))),
        new Tool("hasibat-aqsat-bai3-bittaqsit", "echeancier", "ar",
            "حاسبة جدول أقساط البيع بالتقسيط: أقساط مضبوطة بالسنتيم",
            "حاسبة جدول أقساط التقسيط بالسنتيم",
            "احسب مجاناً جدول أقساط البيع بالتقسيط: التسبيق والباقي وأقساط شهرية مجموعها مضبوط بالسنتيم.",
            "أدخل الثمن والتسبيق وعدد الأشهر فتوزع الحاسبة الباقي على أقساط شهرية. وإذا لم تكن القسمة دقيقة تُضاف السنتيمات الزائدة إلى الأقساط الأولى ليكون المجموع مطابقاً للثمن.",
            "الباقي = الثمن − التسبيق ؛ القسط ≈ الباقي ÷ عدد الأشهر (السنتيمات الزائدة على الأقساط الأولى)",
            "مثال افتراضي: 5 000 درهم، تسبيق 1 000 درهم، 3 أشهر ← 1 333,34 + 1 333,33 + 1 333,33 درهم.",
            List.of(new Faq("لماذا لا تتساوى الأقساط كلها؟", "حتى يكون المجموع مضبوطاً تُضاف السنتيمات الزائدة إلى الأقساط الأولى، والفرق الأقصى 0,01 درهم."),
                    new Faq("ما المدة المناسبة؟", "المدة القصيرة تقلل خطر التأخر وتقلب ثمن الذهب. اقترح بضع مدد جاهزة."),
                    new Faq("هل تغني الأداة عن عقد؟", "لا. هي تحسب المبالغ فقط، وسلّم دائماً وصلاً موقّعاً فيه التواريخ والمبالغ.")))
    );

    public static Optional<Tool> bySlug(String slug) { return ALL.stream().filter(t -> t.slug().equals(slug)).findFirst(); }
}
