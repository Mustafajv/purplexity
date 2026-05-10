import { createClient } from "@/lib/supabase/client"





export default function Auth(){

  const supabase = createClient()

async function login(provider: "github" | "google"){
  const {data, error} = await supabase.auth.signInWithOAuth({
    provider: provider, 
  })
}



return <div>
    <button onClick={()=> login("google")}>login with google</button>
    <button onClick={()=> login("github")}>login with github</button>
</div>
}
