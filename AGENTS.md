<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the dashboard in public/app/index.html, style.css and script.js with the existing iframe host and AI endpoint; this preserves the user’s three-file application.
- Build prompt previews from the same strings used in AI requests; separate preview templates can drift from the actual payload.
- Keep visual tokens in the global stylesheets and honor both the effects preference and reduced motion; this keeps all UI states consistently accessible.
