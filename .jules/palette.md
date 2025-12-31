## 2024-12-23 - Icon-Only Buttons Need ARIA Labels

Icon-only buttons in this repo (especially using shadcn/ui Button + Lucide icons) require explicit `aria-label` attributes for screen reader accessibility.

Pattern to follow:
```tsx
<Button variant="ghost" size="sm" aria-label="Download document">
  <Download className="h-4 w-4" />
</Button>
```

Found violations in `components/admin-dashboard.tsx` (Download + Delete buttons).
