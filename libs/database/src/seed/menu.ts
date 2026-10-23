export interface SeedDish {
  name: string;
  description: string;
  /** In cents; `null` makes the dish open-price. */
  price: number | null;
  /** Defaults to `true`. */
  available?: boolean;
  photo?: string;
}

export interface SeedCategory {
  name: string;
  /** Folder of the category's dish photos. */
  slug: string;
  dishes: SeedDish[];
}

export const menu: SeedCategory[] = [
  {
    name: 'Salads',
    slug: 'salads',
    dishes: [
      {
        name: 'Chicken Caesar',
        price: 1250,
        description: 'Romaine, grilled chicken, parmesan, croutons',
        photo: 'chicken-caesar',
      },
      {
        name: 'Greek Salad',
        price: 1095,
        description: 'Tomatoes, cucumbers, feta, olives',
        photo: 'greek-salad',
      },
      {
        name: 'Caprese',
        price: 1150,
        description: 'Mozzarella, tomatoes, basil',
      },
      {
        name: 'Cobb Salad',
        price: 1395,
        description: 'Chicken, bacon, egg, avocado, blue cheese',
        photo: 'cobb-salad',
      },
      {
        name: 'Warm Beef Salad',
        price: 1495,
        description: 'Mixed greens, seared beef, sesame',
        photo: 'warm-beef-salad',
      },
      {
        name: 'Tuna Salad',
        price: 1295,
        description: 'Tuna, egg, beans, mixed greens',
        photo: 'tuna-salad',
      },
      {
        name: 'Garden Salad',
        price: 850,
        description: 'Seasonal vegetables, herbs, olive oil',
        photo: 'garden-salad',
      },
      {
        name: 'Beet and Goat Cheese',
        price: 1150,
        description: 'Roasted beets, goat cheese, walnuts',
        photo: 'beet-and-goat-cheese',
      },
      {
        name: 'Niçoise',
        price: 1450,
        description: 'Tuna, potatoes, green beans, egg',
        photo: 'nicoise',
      },
      {
        name: 'Waldorf',
        price: 1050,
        description: 'Apples, celery, grapes, walnuts',
        photo: 'waldorf',
      },
    ],
  },
  {
    name: 'Soups',
    slug: 'soups',
    dishes: [
      {
        name: 'Borscht',
        price: 895,
        description: 'Beet soup with sour cream and garlic bread',
        photo: 'borscht',
      },
      {
        name: 'Chicken Noodle Soup',
        price: 750,
        description: 'Homemade noodles',
      },
      {
        name: 'French Onion Soup',
        price: 925,
        description: 'Gruyère crouton',
        photo: 'french-onion-soup',
      },
      {
        name: 'Pumpkin Cream Soup',
        price: 795,
        description: 'Pumpkin seeds and cream',
      },
      {
        name: 'Mushroom Soup',
        price: 850,
        description: 'Porcini and potatoes',
      },
      {
        name: 'Tom Yum',
        price: 1295,
        description: 'Shrimp, coconut milk, lime',
        // Shows the unavailable state in the UI.
        available: false,
        photo: 'tom-yum',
      },
      { name: 'Gazpacho', price: 750, description: 'Cold tomato soup' },
      { name: 'Clam Chowder', price: 1095, description: 'New England style' },
      {
        name: 'Minestrone',
        price: 725,
        description: 'Italian vegetable soup',
      },
      {
        name: 'Fish Soup',
        price: 1150,
        description: 'Pike perch, carp, herbs',
      },
    ],
  },
  {
    name: 'Mains',
    slug: 'mains',
    dishes: [
      {
        name: 'Chicken Kyiv',
        price: 1695,
        description: 'With mashed potatoes',
      },
      { name: 'Potato Pancakes', price: 1095, description: 'With sour cream' },
      {
        name: 'Pierogi',
        price: 995,
        description: 'Potato filling, fried onions',
      },
      {
        name: 'Ribeye Steak',
        price: 3800,
        description: '10 oz, marbled beef',
        photo: 'ribeye-steak',
      },
      {
        name: 'Duck Leg Confit',
        price: 2450,
        description: 'With baked apples',
      },
      {
        name: 'Grilled Salmon',
        price: 2695,
        description: 'With asparagus',
        photo: 'grilled-salmon',
      },
      {
        name: 'Lamb Pilaf',
        price: 1595,
        description: 'Uzbek style',
        photo: 'lamb-pilaf',
      },
      {
        name: 'Cabbage Rolls',
        price: 1295,
        description: 'Beef, rice, tomato sauce',
      },
      {
        name: 'Chicken Curry',
        price: 1495,
        description: 'With basmati rice',
        photo: 'chicken-curry',
      },
      {
        name: 'Catch of the Day',
        price: null,
        description: 'Priced by weight, ask your server',
      },
    ],
  },
  {
    name: 'Pizza',
    slug: 'pizza',
    dishes: [
      {
        name: 'Margherita',
        price: 1295,
        description: 'Tomato sauce, mozzarella, basil',
        photo: 'margherita',
      },
      {
        name: 'Pepperoni',
        price: 1495,
        description: 'Spicy salami, mozzarella',
        photo: 'pepperoni',
      },
      {
        name: 'Four Cheese',
        price: 1695,
        description: 'Mozzarella, gorgonzola, parmesan, feta',
        photo: 'four-cheese',
      },
      {
        name: 'Hawaiian',
        price: 1450,
        description: 'Ham, pineapple',
        photo: 'hawaiian',
      },
      {
        name: 'Diavola',
        price: 1595,
        description: 'Spicy salami, jalapeños',
        photo: 'diavola',
      },
      {
        name: 'Capricciosa',
        price: 1550,
        description: 'Ham, mushrooms, artichokes, olives',
        photo: 'capricciosa',
      },
      {
        name: 'Veggie',
        price: 1350,
        description: 'Peppers, mushrooms, onions, tomatoes',
      },
      {
        name: 'Meat Lovers',
        price: 1795,
        description: 'Bacon, sausage, chicken',
        photo: 'meat-lovers',
      },
      {
        name: 'Seafood',
        price: 1895,
        description: 'Shrimp, mussels, calamari',
      },
      {
        name: 'Calzone',
        price: 1550,
        description: 'Folded, ham, ricotta',
        photo: 'calzone',
      },
    ],
  },
  {
    name: 'Desserts',
    slug: 'desserts',
    dishes: [
      {
        name: 'Tiramisu',
        price: 850,
        description: 'Mascarpone, ladyfingers, espresso',
        photo: 'tiramisu',
      },
      {
        name: 'New York Cheesecake',
        price: 825,
        description: 'With berry sauce',
        photo: 'new-york-cheesecake',
      },
      {
        name: 'Napoleon Cake',
        price: 750,
        description: 'Puff pastry, custard',
      },
      {
        name: 'Cottage Cheese Pancakes',
        price: 795,
        description: 'With sour cream and jam',
        photo: 'cottage-cheese-pancakes',
      },
      {
        name: 'Chocolate Lava Cake',
        price: 925,
        description: 'With a scoop of ice cream',
        photo: 'chocolate-lava-cake',
      },
      {
        name: 'Panna Cotta',
        price: 695,
        description: 'With strawberry sauce',
        photo: 'panna-cotta',
      },
      {
        name: 'Ice Cream',
        price: 595,
        description: 'Three scoops of your choice',
        photo: 'ice-cream',
      },
      { name: 'Apple Strudel', price: 750, description: 'With cinnamon' },
      { name: 'Honey Cake', price: 725, description: 'Homemade' },
      {
        name: 'Custom Cake',
        price: null,
        description: 'Price depends on weight and decoration',
      },
    ],
  },
  {
    name: 'Drinks',
    slug: 'drinks',
    dishes: [
      {
        name: 'Espresso',
        price: 300,
        description: '1 oz',
        photo: 'espresso',
      },
      {
        name: 'Cappuccino',
        price: 450,
        description: '8 oz',
        photo: 'cappuccino',
      },
      { name: 'Latte', price: 495, description: '12 oz', photo: 'latte' },
      {
        name: 'Black Tea',
        price: 350,
        description: 'Pot, 16 oz',
        photo: 'black-tea',
      },
      {
        name: 'Iced Tea',
        price: 395,
        description: '16 oz',
        photo: 'iced-tea',
      },
      {
        name: 'Lemonade',
        price: 495,
        description: 'Classic, 14 oz',
        photo: 'lemonade',
      },
      {
        name: 'Fresh Orange Juice',
        price: 650,
        description: '8 oz',
        photo: 'fresh-orange-juice',
      },
      {
        name: 'Sparkling Water',
        price: 295,
        description: '16 oz',
        photo: 'sparkling-water',
      },
      { name: 'Cola', price: 325, description: '12 oz', photo: 'cola' },
      {
        name: 'Hot Chocolate',
        price: 450,
        description: 'With marshmallows',
        photo: 'hot-chocolate',
      },
    ],
  },
];
