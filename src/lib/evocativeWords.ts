// src/lib/evocativeWords.ts
// Curated words for the "search of the day": concrete, imagery-rich nouns plus a few
// emotions, adjectives and adverbs. Stored as space-separated blocks for easy editing.
// All lowercase, 4+ letters. Add or remove freely — the picker only uses words that
// actually appear in the user's own highlights.

const NATURE = `
cloud clouds storm thunder lightning rain rainfall river rivers stream creek brook lake pond ocean
sea waves wave tide tides shore beach coast island islands cliff cliffs canyon valley mountain
mountains hill hills ridge summit peak glacier iceberg volcano desert dune dunes prairie plain
plains meadow field fields forest forests woods woodland jungle swamp marsh wetland moss fern
ferns vine vines root roots branch branches trunk bark leaf leaves petal petals blossom flower
flowers rose roses tulip lily orchid daisy grass weeds thorn thorns bramble bush bushes shrub
tree trees oak pine birch maple willow cedar cypress palm orchard garden gardens harvest seed
seeds soil mud clay sand gravel pebble pebbles stone stones rock rocks boulder boulders crystal
diamond gold silver copper iron steel bronze marble granite amber pearl coral shell shells
feather feathers wing wings nest nests bird birds eagle hawk falcon owl raven crow sparrow
swan dove heron crane pelican gull seagull hummingbird peacock parrot nightingale lark
horse horses stallion mare wolf wolves fox foxes bear bears lion lions tiger tigers leopard
panther elephant giraffe zebra monkey ape deer stag elk moose rabbit hare squirrel mouse mice
rat bat badger otter beaver seal whale whales dolphin shark fish fishes trout salmon eel
octopus crab lobster oyster snake serpent lizard frog toad turtle tortoise crocodile spider
spiders ant ants bee bees wasp butterfly moth beetle dragonfly firefly cricket locust worm
insect insects cattle sheep lamb goat pig pigs hen rooster duck goose cow bull ox donkey
camel mule dog dogs puppy cat cats kitten creature creatures beast beasts animal animals
sun sunrise sunset sunlight dawn dusk twilight daybreak midnight moon moonlight moons star
stars starlight sky skies heaven heavens horizon galaxy planet planets comet meteor eclipse
universe cosmos earth world sunshine daylight darkness shadow shadows shade ember embers flame
flames fire fires smoke ash ashes spark sparks bonfire candle candles torch lantern lanterns
`;

const WEATHER = `
wind winds breeze gale hurricane tornado cyclone typhoon blizzard snow snowfall snowflake
frost frozen ice icy sleet hail fog mist haze drizzle downpour flood drought heat heatwave
chill cold warmth rainbow thunderstorm overcast sunny cloudy windy stormy foggy misty humid
dewdrop dew puddle puddles torrent monsoon avalanche earthquake tremor weather season seasons
spring summer autumn winter
`;

const PLACES = `
europe europeans asia asian asians africa african africans america american americans
england english britain british france french paris london rome roman romans athens greek
greeks greece germany german germans berlin russia russian russians moscow siberia china
chinese beijing japan japanese tokyo india indian indians egypt egyptian egyptians persia
persian arabia arab arabs jerusalem israel palestine turkey turkish spain spanish madrid
italy italian italians venice florence vienna prague budapest warsaw poland polish ireland
irish dublin scotland scottish wales welsh canada canadian mexico mexican brazil cuba cuban
california texas york chicago boston washington manhattan brooklyn hollywood vegas
antarctica arctic pacific atlantic mediterranean caribbean himalayas alps andes sahara
amazon nile thames danube mississippi
city cities town towns village villages capital kingdom empire empires province territory
frontier border borders country countries nation nations continent continents homeland
street streets avenue alley alleys road roads highway path paths trail trails bridge bridges
tunnel tunnels harbor harbour port docks pier lighthouse castle castles palace palaces
fortress tower towers temple temples church churches cathedral chapel monastery mosque
abbey ruins monument tomb tombs grave graves cemetery graveyard battlefield prison prisons
dungeon market markets bazaar square plaza courtyard garden gardens park parks library
libraries museum theater theatre cinema stadium arena school schools college university
hospital asylum factory factories mill mills farm farms ranch barn barns cottage cabin
mansion house houses home homes apartment kitchen bedroom attic cellar basement hallway
corridor staircase balcony porch doorway threshold garage rooftop skyscraper suburb suburbs
station platform airport railway railroad subway tavern inn hotel hotels cafe restaurant
diner bakery pub saloon brothel shop shops store stores
`;

const OBJECTS = `
book books page pages paper papers letter letters envelope notebook diary journal newspaper
magazine pencil pen ink quill scroll map maps globe compass telescope microscope clock clocks
watch watches hourglass calendar mirror mirrors window windows door doors gate gates fence
walls wall floor ceiling roof chimney stairs ladder rope chain chains lock locks key keys
knife knives sword swords dagger spear arrow arrows bow shield armor helmet gun guns rifle
pistol bullet bullets cannon bomb bombs bomber missile tank tanks soldier soldiers army
armies navy fleet warship submarine airplane plane planes helicopter rocket spaceship
train trains locomotive carriage wagon cart bicycle motorcycle automobile truck taxi bus
ship ships boat boats canoe raft sail sails anchor mast steamer ferry yacht
table tables chair chairs desk bench sofa couch bed beds pillow blanket blankets carpet rug
curtain curtains lamp lamps candlestick mantle fireplace hearth stove oven kettle teapot
cup cups glass glasses bottle bottles jar barrel barrels basket baskets bucket box boxes
chest trunk suitcase bag bags purse wallet coin coins money cash dollar dollars gold treasure
jewel jewels jewelry ring rings necklace crown crowns throne scepter flag flags banner
coat coats jacket dress dresses gown robe cloak cape hat hats cap boots shoes shoe sandals
gloves scarf shirt trousers pants skirt uniform costume mask masks veil umbrella cane
needle thread silk cotton wool leather velvet lace linen cloth fabric
bread wine beer whiskey brandy coffee tea milk butter cheese honey sugar salt pepper spice
spices apple apples orange oranges lemon grape grapes olive olives cherry cherries peach
pear berry berries melon wheat corn rice barley oats bean beans potato potatoes tomato
onion garlic soup stew meat bacon steak chicken egg eggs cake cookies chocolate candy
violin piano guitar drum drums trumpet flute harp bell bells organ orchestra symphony
song songs melody lyrics poem poems poetry verse story stories tale tales legend legends
myth myths fable novel novels painting paintings portrait canvas sculpture statue statues
camera photograph photographs film films telephone radio television screen screens computer
machine machines engine engines wheel wheels gear gears hammer hammers axe plow shovel
tool tools wire wires cable battery lightbulb telescope bottle pill pills medicine poison
syringe bandage coffin casket altar candle cross bible sermon prayer prayers
`;

const BODY_PEOPLE = `
face faces eyes eye lips mouth teeth tongue nose ears hair hands hand fingers finger thumb
arm arms shoulder shoulders chest heart hearts blood bones bone skull skin neck throat back
spine legs knees feet foot toes tears sweat breath voice whisper whispers scream screams
laughter smile smiles frown glance gaze stare beard wrinkles scar scars fist fists
mother father mothers fathers parents child children baby babies boy boys girl girls
brother brothers sister sisters husband wife lover lovers friend friends enemy enemies
stranger strangers neighbor neighbors king queen kings queens prince princess knight knights
warrior warriors soldier priest priests monk nun bishop pope prophet prophets angel angels
demon demons devil ghost ghosts spirit spirits witch wizard giant giants dragon dragons
beggar beggars thief thieves pirate pirates sailor sailors captain farmer farmers peasant
peasants worker workers merchant merchants banker doctor doctors nurse teacher teachers
student students scholar poet poets painter artist artists writer writers author authors
actor actors singer dancer dancers musician musicians judge judges lawyer lawyers
politician politicians president presidents emperor emperors tyrant tyrants rebel rebels
prisoner prisoners refugee refugees immigrants crowd crowds mob army tribe tribes
`;

const EMOTIONS = `
love hate fear terror dread horror anger rage fury hatred envy jealousy greed lust desire
passion longing yearning hope hopes despair grief sorrow sadness misery loneliness solitude
silence joy happiness delight pleasure bliss ecstasy wonder awe pride shame guilt regret
remorse mercy pity compassion kindness cruelty courage bravery cowardice loyalty betrayal
trust doubt faith belief truth lies lie freedom liberty slavery tyranny justice revenge
vengeance peace war wars battle battles conflict violence murder death dying birth
life lives soul souls mind dream dreams nightmare nightmares memory memories nostalgia
fate destiny fortune luck chance miracle mystery mysteries secret secrets rumor
laughter tears
`;

const ADJECTIVES = `
sharp blunt white black red blue green yellow purple crimson scarlet golden silver grey gray
brown pale dark bright brilliant dim faint vivid gloomy radiant shining gleaming glittering
shimmering glowing burning blazing smoldering frozen icy cold warm hot cool fierce gentle
tender soft hard rough smooth silky coarse slick sticky wet damp dry dusty muddy dirty clean
pure lovely beautiful beauty ugly handsome elegant graceful clumsy awkward delicate fragile
sturdy strong weak mighty tiny huge enormous vast immense endless infinite narrow broad
steep shallow deep hollow empty crowded silent quiet noisy loud thunderous whispering
ancient old young aged weary tired restless eager anxious nervous calm serene peaceful
wild savage tame barren fertile lush bleak desolate lonely forsaken forgotten haunted
mysterious strange curious peculiar bizarre grotesque sinister wicked evil holy sacred
divine heavenly infernal royal noble humble proud arrogant cunning clever foolish wise
bitter sweet sour salty fragrant pungent rotten ripe fresh stale rusty golden crooked
twisted tangled jagged crumbling shattered broken ruined abandoned splendid magnificent
glorious majestic grand sublime ominous eerie spectral ghostly shadowy bloody brutal
savage cruel merciless relentless ruthless fearless reckless dazzling luminous translucent
`;

const ADVERBS = `
slowly gently softly quietly silently swiftly suddenly fiercely boldly bitterly tenderly
fondly warmly coldly brightly darkly faintly vividly gracefully clumsily eagerly wearily
grimly gravely solemnly lazily endlessly forever nowhere everywhere
`;

function toSet(...blocks: string[]): Set<string> {
  const out = new Set<string>();
  for (const block of blocks) {
    for (const w of block.split(/\s+/)) {
      if (w.length >= 4) out.add(w);
    }
  }
  return out;
}

export const EVOCATIVE_WORDS: ReadonlySet<string> = toSet(
  NATURE, WEATHER, PLACES, OBJECTS, BODY_PEOPLE, EMOTIONS, ADJECTIVES, ADVERBS
);
