// Velocidade máxima em voo nivelado com pós-combustão, usando as MESMAS fórmulas do stepPlayer do jogo.
export function topSpeed(A,h,ab=1){const rho=1.225*Math.exp(-h/8500),a=Math.max(295,340.3-.0039*h),m=A.empty+A.fuel*.5,W=m*9.81;
 const net=M=>{const v=M*a,q=.5*rho*v*v;const sweepPos=A.sweep?(M>1.05?68:20):20,sf=A.sweep?(sweepPos-20)/48:0;const CLa=A.CLa-1.9*sf;const CL=W/(q*A.S);
  const wave=(M>.82?(M<1.05?(M-.82)/.23:Math.max(.5,1-(M-1.05)*.3)):0)*.042*(1.15-.6*sf)*(A.wave||1);
  const kias=v*Math.sqrt(rho/1.225)*1.943844,ov=Math.max(0,kias-(A.vne||800))/40;const CD=A.cd0+(M>1?.014:0)+wave+(A.k+.11*sf)*CL*CL+ov*ov*.06;const D=q*A.S*CD;const dens=Math.pow(rho/1.225,.72)*(1+(A.ram??.32)*Math.min(M,2.2));const T=(A.mil+ab*A.ab)*dens;return T-D};
 let best=0;for(let M=.2;M<3.2;M+=.002){if(net(M)>0)best=M}return best}
