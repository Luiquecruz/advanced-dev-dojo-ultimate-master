// Probe for src/verify/csharpSandbox.test.ts (engine review, finding 1): learner C# that calls JSFunctionBinding.BindJSFunction and
// InvokeJS through a DynamicMethod, which plain reflection cannot (Span parameters). Names are built at run time, so the DOJO001
// string check does not stop it; Function.prototype.bind, blocked by lockDownCsharp, must.
using System.Reflection;

public static class JsCall
{
    const string JS = ", System.Runtime.InteropServices." + "JavaScript";
    const string CORE = ", System.Private.CoreLib";
    static readonly Type Binding = Type.GetType("System.Runtime.InteropServices." + "JavaScript.JSFunctionBinding" + JS)!;
    static readonly Type MType = Type.GetType("System.Runtime.InteropServices." + "JavaScript.JSMarshalerType" + JS)!;
    static readonly Type Arg = Type.GetType("System.Runtime.InteropServices." + "JavaScript.JSMarshalerArgument" + JS)!;
    public static readonly Type JSObjectType = Type.GetType("System.Runtime.InteropServices." + "JavaScript.JSObject" + JS)!;
    static readonly Type DM = Type.GetType("System.Reflection." + "Emit.DynamicMethod" + CORE)!;
    static readonly Type OpCodesT = Type.GetType("System.Reflection." + "Emit.OpCodes" + CORE)!;
    static readonly Type OpCodeT = Type.GetType("System.Reflection." + "Emit.OpCode" + CORE)!;

    static object Op(string name) => OpCodesT.GetField(name)!.GetValue(null)!;

    // Builds a DynamicMethod (skipVisibility) whose body is produced by `body(il)`.
    static Func<object?[], object?> Make(Type ret, Type[] parameters, Action<object, Func<string, object, object?>> body)
    {
        var dm = Activator.CreateInstance(DM, new object[] { "p" + Guid.NewGuid().ToString("N"), ret, parameters, typeof(object).Module, true })!;
        var il = DM.GetMethod("GetILGenerator", Type.EmptyTypes)!.Invoke(dm, null)!;
        object? Emit(string op, object operand)
        {
            if (operand is null || operand is DBNull) return il.GetType().GetMethod("Emit", new[] { OpCodeT })!.Invoke(il, new[] { Op(op) });
            var t = operand switch { MethodInfo => typeof(MethodInfo), ConstructorInfo => typeof(ConstructorInfo), Type => typeof(Type), int => typeof(int), _ => operand.GetType() };
            if (operand.GetType().Name == "RuntimeLocalBuilder" || operand.GetType().Name == "LocalBuilder") t = Type.GetType("System.Reflection." + "Emit.LocalBuilder" + CORE)!;
            return il.GetType().GetMethod("Emit", new[] { OpCodeT, t })!.Invoke(il, new[] { Op(op), operand });
        }
        body(il, Emit);
        return args => DM.GetMethod("Invoke", new[] { typeof(object), typeof(object[]) })!.Invoke(dm, new object?[] { null, args });
    }

    static MethodInfo Implicit(Type spanOpen, Type element) =>
        spanOpen.MakeGenericType(element).GetMethods().First(m => m.Name == "op_Implicit" && m.GetParameters()[0].ParameterType == element.MakeArrayType());

    static readonly Func<object?[], object?> BindDm = Make(Binding, new[] { typeof(string), typeof(string), MType.MakeArrayType() }, (il, e) =>
    {
        e("Ldarg_0", DBNull.Value); e("Ldarg_1", DBNull.Value); e("Ldarg_2", DBNull.Value);
        e("Call", Implicit(typeof(ReadOnlySpan<>), MType));
        e("Call", Binding.GetMethod("BindJSFunction", BindingFlags.Public | BindingFlags.Static, new[] { typeof(string), typeof(string), typeof(ReadOnlySpan<>).MakeGenericType(MType) })!);
        e("Ret", DBNull.Value);
    });

    static readonly Func<object?[], object?> InvokeDm = Make(typeof(void), new[] { Binding, Arg.MakeArrayType() }, (il, e) =>
    {
        e("Ldarg_0", DBNull.Value); e("Ldarg_1", DBNull.Value);
        e("Call", Implicit(typeof(Span<>), Arg));
        e("Call", Binding.GetMethod("InvokeJS", BindingFlags.Public | BindingFlags.Static)!);
        e("Ret", DBNull.Value);
    });

    static Func<object?[], object?> ArgCall(string method, Type? value, bool outParam)
    {
        var parameters = value is null ? new[] { Arg.MakeArrayType(), typeof(int) } : new[] { Arg.MakeArrayType(), typeof(int), value };
        return Make(outParam ? value! : typeof(void), outParam ? new[] { Arg.MakeArrayType(), typeof(int) } : parameters, (il, e) =>
        {
            object? local = null;
            if (outParam) local = il.GetType().GetMethod("DeclareLocal", new[] { typeof(Type) })!.Invoke(il, new object[] { value! });
            e("Ldarg_0", DBNull.Value); e("Ldarg_1", DBNull.Value); e("Ldelema", Arg);
            if (outParam) e("Ldloca", local!); else if (value is not null) e("Ldarg_2", DBNull.Value);
            var m = Arg.GetMethods().First(m => m.Name == method && (value is null ? m.GetParameters().Length == 0 : m.GetParameters().Length == 1 && m.GetParameters()[0].ParameterType == (outParam ? value.MakeByRefType() : value)));
            e("Call", m);
            if (outParam) e("Ldloc", local!);
            e("Ret", DBNull.Value);
        });
    }

    static readonly Func<object?[], object?> Init = ArgCall("Initialize", null, false);
    static readonly Func<object?[], object?> ToJsString = ArgCall("ToJS", typeof(string), false);
    static readonly Func<object?[], object?> ToJsObject = ArgCall("ToJS", JSObjectType, false);
    static readonly Func<object?[], object?> FromString = ArgCall("ToManaged", typeof(string), true);
    static readonly Func<object?[], object?> FromObject = ArgCall("ToManaged", JSObjectType, true);

    static object M(string name) => MType.GetProperty(name)!.GetValue(null)!;

    // Calls a JS function at `path` (globalThis.a.b / INTERNAL.x / module) with string or JSObject args; returns string or JSObject.
    public static object? Call(string path, string? module, bool returnsString, params object?[] args)
    {
        var sig = Array.CreateInstance(MType, args.Length + 1);
        sig.SetValue(returnsString ? M("String") : M("JSObject"), 0);
        for (var i = 0; i < args.Length; i++) sig.SetValue(args[i] is string ? M("String") : M("JSObject"), i + 1);
        var binding = BindDm(new object?[] { path, module, sig });
        var a = Array.CreateInstance(Arg, args.Length + 2);
        Init(new object?[] { a, 0 }); Init(new object?[] { a, 1 });
        for (var i = 0; i < args.Length; i++)
        {
            if (args[i] is string s) ToJsString(new object?[] { a, i + 2, s }); else ToJsObject(new object?[] { a, i + 2, args[i] });
        }
        InvokeDm(new object?[] { binding, a });
        return returnsString ? FromString(new object?[] { a, 1 }) : FromObject(new object?[] { a, 1 });
    }

    public static object GlobalThis() => Type.GetType("System.Runtime.InteropServices." + "JavaScript.JSHost" + JS)!.GetProperty("GlobalThis")!.GetValue(null)!;
    public static object? Get(object target, string name) => target.GetType().GetMethod("GetPropertyAsJSObject")!.Invoke(target, new object[] { name });
    public static string Keys(object target) => (string)Call("globalThis.JSON.stringify", null, true, Call("globalThis.Object.getOwnPropertyNames", null, false, target))!;
}
