"use strict";

const DISH_COUNT = 5;

function Dish(name, cost, price, sold) {
  this.name = name;
  this.cost = cost;
  this.price = price;
  this.sold = sold;
  this.profit = this.calcProfit();
}

Dish.prototype.calcProfit = function () {
  return (this.price - this.cost) * this.sold;
};

function linkToRestaurant(restaurant) {
  Object.setPrototypeOf(Dish.prototype, restaurant);
}

const form = document.getElementById("form");
const dishesBox = document.getElementById("dishes");
const resultBox = document.getElementById("result");

const dishFields = [
  { key: "name", label: "Назва страви", numeric: false },
  { key: "cost", label: "Собівартість, грн", numeric: true },
  { key: "price", label: "Ціна продажу, грн", numeric: true },
  { key: "sold", label: "Продано порцій", numeric: true, integer: true },
];

for (let i = 0; i < DISH_COUNT; i++) {
  const box = document.createElement("div");
  box.className = "dish";
  box.innerHTML =
    `<h4>Страва ${i + 1}</h4><div class="grid">` +
    dishFields
      .map((f) => {
        const id = `d${i}-${f.key}`;
        return `<div class="field">
          <label for="${id}">${f.label} <b>*</b></label>
          <input id="${id}" type="text" ${f.numeric ? 'inputmode="decimal"' : ""} autocomplete="off">
          <small class="err" data-for="${id}" role="alert"></small>
        </div>`;
      })
      .join("") +
    "</div>";
  dishesBox.appendChild(box);
}

function setError(id, msg) {
  const input = document.getElementById(id);
  const err = document.querySelector(`.err[data-for="${id}"]`);
  err.textContent = msg;
  if (msg) input.setAttribute("aria-invalid", "true");
  else input.removeAttribute("aria-invalid");
  return !msg;
}

function validateText(id) {
  const v = document.getElementById(id).value.trim();
  return setError(id, v ? "" : "Поле не може бути порожнім");
}

function validateNumber(id, integer) {
  const v = document.getElementById(id).value.trim().replace(",", ".");
  if (v === "") return setError(id, "Поле не може бути порожнім");
  if (!/^-?\d+(\.\d+)?$/.test(v)) return setError(id, "Введіть лише число");
  if (Number(v) < 0) return setError(id, "Значення не може бути від'ємним");
  if (integer && !Number.isInteger(Number(v))) return setError(id, "Потрібне ціле число");
  return setError(id, "");
}

function validateAll() {
  let ok = true;
  ["r-name", "r-address", "r-cuisine"].forEach((id) => {
    ok = validateText(id) && ok;
  });
  for (let i = 0; i < DISH_COUNT; i++) {
    dishFields.forEach((f) => {
      const id = `d${i}-${f.key}`;
      const valid = f.numeric ? validateNumber(id, f.integer) : validateText(id);
      ok = valid && ok;
    });
  }
  return ok;
}

form.addEventListener("focusout", (e) => {
  const input = e.target;
  if (input.tagName !== "INPUT") return;
  const id = input.id;
  if (id.startsWith("r-") || id.endsWith("-name")) validateText(id);
  else validateNumber(id, id.endsWith("-sold"));
});

const num = (id) => Number(document.getElementById(id).value.trim().replace(",", "."));
const str = (id) => document.getElementById(id).value.trim();

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!validateAll()) {
    const first = form.querySelector('[aria-invalid="true"]');
    if (first) first.focus();
    return;
  }

  const restaurant = {
    restaurantName: str("r-name"),
    address: str("r-address"),
    cuisine: str("r-cuisine"),
  };
  linkToRestaurant(restaurant);

  const dishes = [];
  for (let i = 0; i < DISH_COUNT; i++) {
    dishes.push(new Dish(str(`d${i}-name`), num(`d${i}-cost`), num(`d${i}-price`), num(`d${i}-sold`)));
  }

  let best = dishes[0];
  for (let i = 1; i < dishes.length; i++) {
    if (dishes[i].profit > best.profit) best = dishes[i];
  }

  render(best, dishes);
});

form.addEventListener("reset", () => {
  form.querySelectorAll(".err").forEach((el) => (el.textContent = ""));
  form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
  resultBox.hidden = true;
});

const money = (n) => n.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " грн";

function kv(label, value, cls = "") {
  return `<div class="kv ${cls}"><span>${label}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function render(best, dishes) {
  document.getElementById("winner").innerHTML =
    kv("Ресторан (успадковано)", best.restaurantName, "inh") +
    kv("Тип кухні (успадковано)", best.cuisine, "inh") +
    kv("Адреса (успадковано)", best.address, "inh") +
    kv("Назва страви", best.name, "own") +
    kv("Собівартість", money(best.cost), "own") +
    kv("Ціна продажу", money(best.price), "own") +
    kv("Продано порцій", best.sold, "own") +
    kv("Прибуток", money(best.profit), "profit");

  const props = ["name", "cost", "price", "sold", "profit", "restaurantName", "address", "cuisine"];
  const rows = props.map((p) => ({ property: p, own: best.hasOwnProperty(p), inherited: p in best && !best.hasOwnProperty(p) }));
  document.getElementById("own-check").innerHTML = rows
    .map((r) =>
      r.own
        ? `<span class="tag own">${r.property}: власна (hasOwnProperty = true)</span>`
        : `<span class="tag inh">${r.property}: успадкована (hasOwnProperty = false)</span>`
    )
    .join("");
  console.log("Перевірка hasOwnProperty для знайденої страви:");
  console.table(rows);

  const chain = [];
  let obj = best;
  while (obj !== null) {
    let label;
    if (obj === best) label = `Dish { ${Object.keys(obj).join(", ")} }`;
    else if (obj === Dish.prototype) label = "Dish.prototype { calcProfit, constructor }";
    else if (obj === Object.prototype) label = "Object.prototype";
    else label = `Ресторан { ${Object.keys(obj).join(", ")} }`;
    chain.push(label);
    console.log(obj);
    obj = Object.getPrototypeOf(obj);
  }
  chain.push("null");
  console.log("Ланцюжок прототипів:", chain.join(" → "));
  document.getElementById("chain").textContent = chain.join("\n  ↓ __proto__\n");

  document.querySelector("#table tbody").innerHTML = dishes
    .map(
      (d) =>
        `<tr class="${d === best ? "top" : ""}"><td>${escapeHtml(d.name)}</td><td>${money(d.cost)}</td><td>${money(d.price)}</td><td>${d.sold}</td><td>${money(d.profit)}</td></tr>`
    )
    .join("");

  resultBox.hidden = false;
  resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.getElementById("fill").addEventListener("click", () => {
  const demo = {
    "r-name": "La Piazza",
    "r-address": "вул. Хрещатик, 12, Київ",
    "r-cuisine": "Італійська",
  };
  const items = [
    ["Маргарита", 90, 210, 120],
    ["Карбонара", 110, 260, 95],
    ["Лазанья", 130, 290, 70],
    ["Тірамісу", 60, 170, 110],
    ["Різотто", 100, 240, 60],
  ];
  items.forEach((it, i) => {
    dishFields.forEach((f, j) => (demo[`d${i}-${f.key}`] = it[j]));
  });
  Object.entries(demo).forEach(([id, v]) => {
    document.getElementById(id).value = v;
    setError(id, "");
  });
});
