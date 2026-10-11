import * as React from "react";
import { describe,it,expect,vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const session=vi.hoisted(()=>({role:"CONSULTANT",loading:false,path:"/orders"}));
vi.mock("@/components/auth/auth-provider",()=>({useAuth:()=>({user:{role:session.role},isAuthenticated:true,isLoading:session.loading})}));
vi.mock("next/navigation",()=>({usePathname:()=>session.path,useRouter:()=>({replace:vi.fn()})}));
import { RequireAuth } from "./require-auth";
describe("CRM route guard",()=>{
 it("does not render restricted content for a secondary session",()=>{session.role="CONSULTANT";session.path="/orders";session.loading=false;const html=renderToStaticMarkup(<RequireAuth><div>Protected business content</div></RequireAuth>);expect(html).not.toContain("Protected business content");expect(html).toContain("Redirecionando para Tracking");});
 it("allows Tracking without a redirect loop",()=>{session.role="MANAGER";session.path="/tracking/vendas";const html=renderToStaticMarkup(<RequireAuth><div>Tracking analysis</div></RequireAuth>);expect(html).toContain("Tracking analysis");});
 it("renders admin content unchanged",()=>{session.role="ADMIN";session.path="/orders";const html=renderToStaticMarkup(<RequireAuth><div>Admin business content</div></RequireAuth>);expect(html).toContain("Admin business content");});
 it("waits for session resolution before mounting the shell",()=>{session.loading=true;const html=renderToStaticMarkup(<RequireAuth><div>Protected business content</div></RequireAuth>);expect(html).toContain("Carregando sessão");expect(html).not.toContain("Protected business content");session.loading=false;});
});