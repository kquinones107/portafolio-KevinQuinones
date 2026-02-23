import { CONFIG } from "../data/config.js";
import { FALLBACK_PROJECTS } from "../data/fallback-projects.js";
import { state } from "./state.js";
import { el, $, normalize, setPressed, inferType, typeLabel, typeBadgeClass, prettyDate } from "./ui.js";
import { getUser, getRepos } from "./services/github.js";
import { FEATURED } from "../data/featured.js";


function renderHeroChips() {
  const chips = ["React", "React Native", "Expo", "TypeScript", "Node", "Python"];
  const root = $("#heroChips");
  root.innerHTML = "";
  chips.forEach((c) => root.append(el("span", { className: "chip" }, [c])));
}

function repoCard(r) {
  const type = inferType(r);
  const badge = el("span", { className: `badge-pill ${typeBadgeClass(type)}` }, [typeLabel(type)]);

  const tags = el(
    "div",
    { className: "tags" },
    (r.topics || []).slice(0, 6).map((t) => el("span", { className: "tag" }, [t]))
  );

  const actions = el("div", { className: "project__actions" }, [
    el("a", { className: "btn btn--primary", href: `project.html?repo=${encodeURIComponent(r.name)}` }, ["Ver detalle"]),
    el("a", { className: "btn btn--ghost", href: r.html_url, target: "_blank", rel: "noreferrer" }, ["GitHub"]),
    r.homepage
      ? el("a", { className: "btn btn--ghost", href: r.homepage, target: "_blank", rel: "noreferrer" }, ["Demo"])
      : null,
  ].filter(Boolean));

  const body = el("div", { className: "project__body" }, [
    el("div", { className: "project__top" }, [
      el("h3", {}, [r.name]),
      badge,
    ]),
    el("p", { className: "muted project__meta" }, [r.description]),
    el("p", { className: "muted small" }, [`${r.language} · Actualizado: ${prettyDate(r.updated_at)}`]),
    tags,
    actions,
  ]);

  const imagePath = `assets/img/projects/${r.name.toLowerCase()}.png`;

  const img = el("img", {
    src: imagePath,
    alt: `Screenshot de ${r.name}`,
    loading: "lazy",
    onerror: (e) => {
      // Si no existe imagen, usa fondo degradado
      e.target.remove();
    }
  });

  const media = el("div", { className: "project__media" }, [
    img,
    el("strong", {}, [typeLabel(type)])
  ]);

  return el("article", { className: "card project", "data-type": type }, [media, body]);
}

function renderProjects(list) {
  const root = $("#projectsGrid");
  root.innerHTML = "";
  list.forEach((r) => root.append(repoCard(r)));
  $("#projectsCount").textContent = `${list.length} proyecto(s) mostrado(s).`;
}

function getFilteredRepos() {
  const q = normalize(state.query);
  return state.repos.filter((r) => {
    const type = inferType(r);
    const matchType = state.filter === "all" || state.filter === type;

    const haystack = normalize(
      [
        r.name,
        r.description,
        r.language,
        ...(r.topics || []),
      ].join(" ")
    );
    const matchQuery = !q || haystack.includes(q);

    return matchType && matchQuery;
  });
}

function setupControls() {
  const buttons = Array.from(document.querySelectorAll(".filter"));
  const search = $("#projectSearch");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.filter = btn.dataset.filter;
      setPressed(buttons, btn);
      renderProjects(getFilteredRepos());
    });
  });

  search.addEventListener("input", (e) => {
    state.query = e.target.value;
    renderProjects(getFilteredRepos());
  });
}

function updateHeaderLinks() {
  $("#btnGithub").href = `https://github.com/${CONFIG.githubUsername}`;
  $("#btnLinkedIn").href = "https://www.linkedin.com/in/kevin-jair-quinones-sierra-aa1b26265";
}

function setStatus(msg, isError = false) {
  const box = $("#statusBox");
  box.textContent = msg;
  box.style.borderColor = isError ? "rgba(255,120,120,.35)" : "rgba(110,168,254,.35)";
  box.style.background = isError ? "rgba(255,120,120,.08)" : "rgba(110,168,254,.08)";
}

async function loadGitHub() {
  try {
    const [user, repos] = await Promise.all([
      getUser(CONFIG.githubUsername),
      getRepos(CONFIG.githubUsername),
    ]);

    state.profile = user;
    state.repos = repos;

    // Hero stats
    $("#ghUser").textContent = user.login;
    $("#ghRepoCount").textContent = user.public_repos ?? "—";

    // Total stars (sum)
    const stars = repos.reduce((acc, r) => acc + (r.stargazers_count || 0), 0);
    $("#ghStars").textContent = String(stars);

    setStatus("Datos cargados ✅");
  } catch (err) {
    console.error(err);
    state.repos = FALLBACK_PROJECTS;
    $("#ghUser").textContent = CONFIG.githubUsername;
    $("#ghRepoCount").textContent = "—";
    $("#ghStars").textContent = "—";
    setStatus("No se pudo cargar GitHub (usando fallback). Revisa rate limit o token.", true);
  }
}

async function init() {
  $("#year").textContent = new Date().getFullYear();
  renderHeroChips();
  updateHeaderLinks();
  setupControls();
  setupShowAll();

  await loadGitHub();
  renderFeatured(state.repos);
}

init();

const featuredGrid = document.getElementById("featuredGrid");

function renderFeatured(repos) {
  if (!featuredGrid) return;
  featuredGrid.innerHTML = "";

  const byName = new Map(repos.map(r => [r.name, r]));
  const featuredRepos = FEATURED
    .map(f => byName.get(f.repo))
    .filter(Boolean);

  featuredRepos.forEach((r) => {
    featuredGrid.appendChild(repoCard(r)); // MISMAS cards, mismos estilos ✅
  });
}


function setupShowAll() {
  const btn = document.getElementById("btnShowAll");
  const wrap = document.getElementById("allProjectsWrap");

  if (!btn || !wrap) return;

  btn.addEventListener("click", (e) => {
    e.preventDefault();

    // Mostrar bloque de todos
    wrap.style.display = "block";

    // Renderizar solo cuando se abre (lazy render)
    renderProjects(getFilteredRepos());

    // Scroll suave a "Todos"
    document.getElementById("all-projects")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

